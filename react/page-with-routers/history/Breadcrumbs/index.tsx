import React from 'react';
import style from './style.module.scss';

type Props = {
  items: string[];
};

const Breadcrumbs = (props: Props) => (
  <ul className={style.root}>
    {props.items.map((item, idx) => <li key={idx}>{item}</li>)}
  </ul>
);

export default Breadcrumbs;
