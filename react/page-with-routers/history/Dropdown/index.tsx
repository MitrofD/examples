import React, {
  Fragment,
  useState,
} from 'react';

import sounds from 'api/sounds';
import { asNumber } from 'api/tools';
import style from './style.module.scss';
import commonStyle from '../style.module.scss';

type Props = {
  items: string[];
  onChange: (value: string) => void;
  value: string;
};

const defaultProps = {
  items: [],
};

const Dropdown = (props: Props) => {
  const [
    isActive,
    setIsActive,
  ] = useState(false);

  const onToggle = (event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsActive(!isActive);
    sounds.click();
  };

  const onClickToItem = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const { idx } = event.currentTarget.dataset;
    const pureIndex = asNumber(idx);
    const variant = props.items[pureIndex];

    if (typeof variant === 'string') {
      props.onChange(variant);
    }

    onToggle();
  };

  let className = style.root;
  let dropdownContent: React.ReactNode = null;

  if (isActive && props.items.length > 0) {
    className += ` ${style.active}`;

    dropdownContent = (
      <Fragment>
        <div
          className={commonStyle.overlay}
          onClick={onToggle}
        />
        <ul className={style.dropdown}>
          {props.items.map((variant, idx) => {
            let itemClassName = style.item;

            if (variant === props.value) {
              itemClassName += ` ${style.active}`;
            }

            return (
              <li
                className={itemClassName}
                key={idx}
              >
                <a
                  data-idx={idx}
                  href="#!"
                  onClick={onClickToItem}
                >
                  {variant}
                </a>
              </li>
            );
          })}
        </ul>
      </Fragment>
    );
  }

  return (
    <div className={className}>
      <div
        className={`${commonStyle.input} ${style.input}`}
        onClick={onToggle}
      >
        {props.value}
      </div>
      {dropdownContent}
    </div>
  );
};

Dropdown.defaultProps = defaultProps;

export default Dropdown;
