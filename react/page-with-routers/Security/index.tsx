import React from 'react';
import History from './History';
import Password from './Password';
import style from './style.module.scss';

const Security = () => {
  return (
    <div className={style.root}>
      <div className={style.password}>
        <div className={style.title}>CHANGE PASSWORD</div>
        <Password />
      </div>
      <div className={style.history}>
        <div className={style.title}>LOG IN HISTORY</div>
        <History />
      </div>
    </div>
  );
};

export default Security;
