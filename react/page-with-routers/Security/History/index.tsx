import React, {
  useEffect,
  useState,
} from 'react';

import Spin from 'components/spins/DoubleBounceSpin';
import {
  asObject,
  isObject,
} from 'api/tools';

import request, {
  Method,
  Type,
} from 'api/request';

import {
  getPrivateRequestData,
  makePrivateRequest,
} from 'api/user';

import { getPrettyTimeParts } from '../../../../../common/helper';
import style from './style.module.scss';

type Response = {
  createdAt: Date;
  device: string;
  deviceType: string;
  ip: string;
  location: string;
};

type Data = Response | Error;

const History = () => {
  const [
    data,
    setData,
  ] = useState<Nullable<Response | Error>>(null);

  useEffect(() => {
    let unmounted = false;

    const safeSetData = (newData: Data) => {
      if (unmounted) {
        return;
      }

      setData(newData);
    };

    makePrivateRequest(() => request.make<Record<string, any>>(Method.Get, '/cabinet/security/last-login', getPrivateRequestData({
      Type: Type.Array,
    }))).then((items) => {
      const firstItem = asObject(items[0]);

      if (isObject(firstItem)) {
        firstItem.createdAt = new Date(firstItem.createdAt * 1000);
        safeSetData(firstItem);
        return;
      }

      throw new Error('History is empty');
    }).catch(safeSetData);

    return () => {
      unmounted = true;
    };
  }, [
    setData,
  ]);

  let className = style.root;
  let content: React.ReactNode = null;

  if (data instanceof Error) {
    content = (
      <div className={style.error}>
        {data.message}
      </div>
    );
  } else if (isObject(data)) {
    const dateParts = getPrettyTimeParts(data.createdAt);

    content = (
      <ul>
        <li>Date: {dateParts.date}/{dateParts.month}/{data.createdAt.getFullYear()} UTC {dateParts.hours}:{dateParts.minutes}:{dateParts.seconds}</li>
        <li>IP: {data.ip}</li>
        <li>Device/OS: {data.deviceType}</li>
        <li>Browser: {data.device}</li>
        <li>Location: {data.location}</li>
      </ul>
    );
  } else {
    className += `${style.loading}`;
    content = <Spin />;
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
};

export default History;
