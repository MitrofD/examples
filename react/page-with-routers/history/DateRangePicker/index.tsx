import React, {
  Fragment,
  useState,
} from 'react';

import { DateRangePicker } from 'react-date-range';
import sounds from 'api/sounds';
import { getDateWithGMTOffset } from 'api/tools';
import { getPrettyTimeParts } from '../../../../../common/helper';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import style from './style.module.scss';
import commonStyle from '../style.module.scss';

type Props = {
  from: Date;
  onChange: (from: Date, to: Date) => void;
  to: Date;
};

const DateRangePickerLocal = (props: Props) => {
  const [
    showPicker,
    setShowPicker,
  ] = useState(false);

  const onToggle = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setShowPicker(!showPicker);
    sounds.click();
  };

  let content: React.ReactNode = null;

  if (showPicker) {
    const onChangeDateRangePicker = (state) => {
      props.onChange(state.selection.startDate, state.selection.endDate);
      sounds.click();
    };

    content = (
      <Fragment>
        <div
          className={commonStyle.overlay}
          onClick={onToggle}
        />
        <DateRangePicker
          showSelectionPreview
          className={style.picker}
          direction="horizontal"
          onChange={onChangeDateRangePicker}
          months={2}
          moveRangeOnFirstSelection={false}
          maxDate={getDateWithGMTOffset(new Date())}
          ranges={[{
            startDate: props.from,
            endDate: props.to,
            key: 'selection',
          }]}
        />
      </Fragment>
    );
  }

  const fromDateParts = getPrettyTimeParts(props.from);
  const toDateParts = getPrettyTimeParts(props.to);

  return (
    <div className={style.root}>
      <div
        className={`${commonStyle.input} ${style.input}`}
        onClick={onToggle}
      >
        {fromDateParts.date}/{fromDateParts.month}/{props.from.getFullYear()} - {toDateParts.date}/{toDateParts.month}/{props.to.getFullYear()}
      </div>
      {content}
    </div>
  );
};

export default DateRangePickerLocal;
