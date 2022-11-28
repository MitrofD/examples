import React, {
  useState,
} from 'react';

import style from './style.module.scss';

const Password = () => {
  const [
    isXHRRequest,
    setIsXHRRequest,
  ] = useState(false);

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
  };

  const disabledSubmit = isXHRRequest;

  return (
    <form
      noValidate
      className={style.root}
      onSubmit={onSubmitForm}
    >
      <div className={style.control}>
        <label>Enter old password</label>
        <input
          name="password"
          type="password"
        />
      </div>
      <div className={style.control}>
        <label>Enter new password</label>
        <input
          name="new-password"
          type="password"
        />
      </div>
      <div className={style.control}>
        <label>Confirm old password</label>
        <input
          name="repeat-new-password"
          type="password"
        />
      </div>
      <button
        disabled={disabledSubmit}
        type="submit"
      >
        SUBMIT
      </button>
    </form>
  );
};

export default Password;
