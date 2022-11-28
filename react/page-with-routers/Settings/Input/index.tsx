import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import NumberFormat from 'react-number-format';
import sounds from 'api/sounds';
import style from './style.module.scss';

type Props = {
  disabled: boolean;
  name: string;
  title: string;
  value: string;
  error?: string;
  maskOfNum?: string;
  onChange?: (input: HTMLInputElement) => void;
};

const defaultProps = {
  disabled: false,
  value: '',
};

const Input = (props: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [
    isEditMode,
    setIsEditMode,
  ] = useState(false);

  const [
    value,
    setValue,
  ] = useState(props.value);

  useEffect(() => {
    if (props.disabled) {
      setIsEditMode(false);
    }
  }, [
    props.disabled,
    setIsEditMode,
  ]);

  const onToggleEditMode = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (props.disabled) {
      return;
    }

    const prevModeIsEdit = isEditMode;

    setIsEditMode(!isEditMode);
    sounds.click();

    if (inputRef.current instanceof HTMLInputElement) {
      if (prevModeIsEdit) {
        if (typeof props.onChange === 'function' && props.value !== value) {
          props.onChange(inputRef.current);
        }
      } else {
        setTimeout(() => {
          inputRef.current.focus();
        }, 0);
      }
    }
  };

  let className = style.root;
  let nodeOfError: React.ReactNode = null;

  if (props.disabled) {
    className += ` ${style.disabled}`;
  } else if (isEditMode) {
    className += ` ${style.active}`;
  } else if (typeof props.error === 'string') {
    nodeOfError = (
      <div className={style.error}>
        (Error: {props.error})
      </div>
    );
  }

  let input: React.ReactNode = null;

  if (typeof props.maskOfNum === 'string') {
    const onValueChange = (values) => {
      setValue(typeof values.formattedValue === 'string' ? values.formattedValue : '');
    };

    input = (
      <NumberFormat
        format={props.maskOfNum}
        getInputRef={inputRef}
        onValueChange={onValueChange}
        name={props.name}
        value={value}
      />
    );
  } else {
    const onChangeInput = (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.currentTarget.value);
    };

    input = (
      <input
        onChange={onChangeInput}
        name={props.name}
        ref={inputRef}
        value={value}
      />
    );
  }

  return (
    <tr className={className}>
      <td>
        <div className={style.inner}>
          {props.title}
        </div>
      </td>
      <td className={style.value}>
        <div className={style.inner}>
          <div className={style.data}>
            <div>{value}</div>
            {nodeOfError}
          </div>
          {input}
        </div>
      </td>
      <td className={style.action}>
        <div className={style.inner}>
          <a
            className={style.edit}
            href="#!"
            onClick={onToggleEditMode}
          />
          <a
            className={style.save}
            href="#!"
            onClick={onToggleEditMode}
          >
            Save
          </a>
        </div>
      </td>
    </tr>
  );
};

Input.defaultProps = defaultProps;

export default Input;
