import React, {
  Fragment,
  createRef,
} from 'react';

import NumberFormat from 'react-number-format';
import Modal from 'components/Modal';
import Spin from 'components/spins/DoubleBounceSpin';
import {
  getUrlOfUser,
  getUrlOfUserAvatar,
} from 'api/helper';

import sounds from 'api/sounds';
import {
  asNumber,
  getLastPartOfPath,
  getStringOr,
  has,
  isObject,
  regExps,
} from 'api/tools';

import {
  getAdvancedDataOfUser,
  update,
  uploadFile,
} from 'api/user';

import Input from './Input';
import Avatar from '../../../common/Avatar';
import {
  getErrorStoreFromAxios,
  popularErrors,
} from '../../../../common/helper';

import style from './style.module.scss';

type Props = {
  data: UserContext.Data;
};

type State = {
  advancedData: Nullable<User.AdvancedData> | Error;
  error: React.ReactNode;
  errors: Record<string, string>;
  isPreviewDocMode: boolean;
  isUploadFile: boolean;
  isXHR: boolean;
  srcOfPreviewDoc: string;
};

class Settings extends React.PureComponent<Props, State> {
  refOfForm = createRef<HTMLFormElement>();

  unmounted = true;

  constructor(props: Props, context: null) {
    super(props, context);

    this.state = {
      advancedData: null,
      error: null,
      errors: {},
      isPreviewDocMode: false,
      isUploadFile: false,
      isXHR: false,
      srcOfPreviewDoc: '',
    };

    this.onChangeInput = this.onChangeInput.bind(this);
    this.onChangeImageOfAvatar = this.onChangeImageOfAvatar.bind(this);
    this.onChangeDocOfProof = this.onChangeDocOfProof.bind(this);
    this.onClickToDoc = this.onClickToDoc.bind(this);
    this.onCloseModal = this.onCloseModal.bind(this);
  }

  componentDidMount() {
    this.unmounted = false;

    getAdvancedDataOfUser().then((advancedData) => {
      this.setStateSafe({
        advancedData,
      });
    }).catch((advancedData) => {
      this.setStateSafe({
        advancedData,
      });
    });
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  onChangeInput() {
    const form = this.refOfForm.current;

    if (this.refOfForm.current instanceof HTMLFormElement) {
      let errors:  Record<string, string> = {};
      const sendData: Record<string, any> = {};
      const pureInputs = [
        'username',
        'name',
        'surname',
        'email',
        'dateOfBirth',
        'citizenship',
        'city',
        'postalCode',
        'address',
        'phone',
      ];

      const needUpdateData: Partial<User.Data> = {};

      const lengthOfPureInputs = pureInputs.length;
      let i = 0;

      for (; i < lengthOfPureInputs; i += 1) {
        const input = pureInputs[i];
        const pureValue = getStringOr(form[input].value, null);

        if (typeof pureValue === 'string') {
          sendData[input] = pureValue;
        }
      }

      if (has.call(sendData, 'username')) {
        needUpdateData.name = sendData.username;
      } else {
        errors.username = popularErrors.required;
      }

      if (!has.call(sendData, 'email')) {
        errors.email = popularErrors.required;
      } else if (!regExps.email.test(sendData.email)) {
        errors.email = popularErrors.emailRegexpIncorrect;
      } else {
        needUpdateData.email = sendData.email;
      }

      if (has.call(sendData, 'phone')) {
        sendData.phone = asNumber(sendData.phone);
      }

      if (Object.keys(errors).length > 0) {
        this.setState({
          errors,
          error: null,
          isXHR: false,
        });
      } else {
        this.setState({
          errors,
          error: null,
          isXHR: true,
        });

        update(sendData).then(() => {
          this.setStateSafe({
            isXHR: false,
          });

          this.props.data.update(needUpdateData);
        }).catch((error) => {
          let errorOfState: React.ReactNode = null;
          const pureError = getErrorStoreFromAxios(error);

          if (pureError instanceof Error) {
            errorOfState = this.genNodeOfErrorWithMessage(pureError.message);
          } else if (isObject(pureError)) {
            errors = pureError;
          }

          this.setStateSafe({
            errors,
            error: errorOfState,
            isXHR: false,
          });
        });
      }
    }
  }

  onChangeImageOfAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    this.onChangeFileWithSuccessCallback(event, () => {
      this.setStateSafe({
        isUploadFile: false,
      });

      this.props.data.update({
        avatarPath: `${getUrlOfUserAvatar(this.props.data.id)}?t=${Date.now()}`,
      });
    });
  }

  onChangeDocOfProof(event: React.ChangeEvent<HTMLInputElement>) {
    this.onChangeFileWithSuccessCallback(event, (name, path) => {
      const newState: Partial<State> = {
        isUploadFile: false,
      };

      if (isObject(this.state.advancedData)) {
        const relDict = {
          ProofId: 'idOfProof',
          ProofResidence: 'residenceOfProof',
        };

        const fieldForUpdate = relDict[name];

        if (typeof fieldForUpdate === 'string') {
          newState.advancedData = Object.assign({}, this.state.advancedData);
          newState.advancedData[fieldForUpdate] = getLastPartOfPath(path);
        }
      }

      this.setStateSafe(newState);
    });
  }

  onChangeFileWithSuccessCallback(event: React.ChangeEvent<HTMLInputElement>, callback: (name: string, path: string) => void) {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      const file = input.files[0];

      if (file instanceof File) {
        this.setState({
          error: null,
          isUploadFile: true,
        });

        uploadFile(input.name, file, {
          extensions: [
            'jpg',
            'jpeg',
            'png',
          ],
        }).then((path) => {
          callback(input.name, path);
        }).catch((error) => {
          this.setStateSafe({
            error: this.genNodeOfErrorWithMessage(error.message),
            isUploadFile: false,
          });
        });
      }
    }
  }

  onClickToDoc(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    if (isObject(this.state.advancedData) && !(this.state.advancedData instanceof Error)) {
      const attributeName = getStringOr(event.currentTarget.dataset.an);
      const nameOfDoc = this.state.advancedData[attributeName];

      if (typeof nameOfDoc === 'string') {
        sounds.click();
        this.setState({
          isPreviewDocMode: true,
          srcOfPreviewDoc: `${getUrlOfUser(this.state.advancedData.id)}/${nameOfDoc}`,
        });
      }
    }
  }

  onCloseModal() {
    sounds.click();
    this.setState({
      isPreviewDocMode: false,
    });
  }

  setStateSafe(newState: Partial<State>) {
    if (this.unmounted) {
      return;
    }

    this.setState(newState as State);
  }

  genNodeOfErrorWithMessage = (message: string) => (
    <div className={style.error}>
      {message}
    </div>
  );

  render() {
    /*
    <tr>
      <td>
        <div className={style.text}>ID BACK</div>
      </td>
      <td>
        <input
          hidden
          disabled={isUploadFile}
          id="id-back-upload"
          name="id-front"
          type="file"
        />
        <label
          className={classNameOfFilePicker}
          htmlFor="id-back-upload"
        >
          {textOfFilePicker}
        </label>
      </td>
      <td />
    </tr>
    */

    const {
      advancedData,
      error,
      errors,
      isPreviewDocMode,
      isUploadFile,
      isXHR,
      srcOfPreviewDoc,
    } = this.state;

    let content: React.ReactNode = null;

    if (advancedData instanceof Error) {
      content = (
        <div className={style.fatalError}>
          {advancedData.message}
        </div>
      );
    } else if (isObject(advancedData)) {
      let classNameOfAvatarPicker: Nullable<string> = null;
      let classNameOfFilePicker = style.button;
      let textOfAvatarPicker = 'Upload Image';
      let textOfFilePicker = 'UPLOAD';

      if (isUploadFile) {
        classNameOfAvatarPicker = style.disabled;
        classNameOfFilePicker += ` ${style.disabled}`;
        textOfAvatarPicker = 'Uploading...';
        textOfFilePicker = 'WAIT...';
      }

      content = (
        <Fragment>
          <div className={style.top}>
            <div className={style.avatar}>
              <Avatar
                avatarPath={this.props.data.avatarPath}
                className={style.image}
              />
              <input
                hidden
                disabled={isUploadFile}
                id="avatar-upload"
                onChange={this.onChangeImageOfAvatar}
                name="Avatar"
                type="file"
              />
              <label
                className={classNameOfAvatarPicker}
                htmlFor="avatar-upload"
              >
                {textOfAvatarPicker}
              </label>
              <div className={style.info}>
                Your Avatar will be displayed publicly  in Traders Games
              </div>
            </div>
            <div className={style.general}>
              <div className={style.item}>
                <div className={style.prop}>
                  USER ID
                </div>
                <div className={style.value}>
                  {this.props.data.id}
                </div>
              </div>
              <div className={style.item}>
                <div className={style.prop}>
                  EMAIL
                </div>
                <div className={style.value}>
                  <a href={`mailto:${this.props.data.email}`}>
                    {this.props.data.email}
                  </a>
                </div>
              </div>
              <div className={style.item}>
                <div className={style.prop}>
                  DEPOSITS
                </div>
                <NumberFormat
                  className={style.value}
                  displayType="text"
                  prefix="$"
                  value={advancedData.deposits}
                />
              </div>
              <div className={style.item}>
                <div className={style.prop}>
                  WITHDRAWALS
                </div>
                <NumberFormat
                  className={style.value}
                  displayType="text"
                  prefix="$"
                  value={advancedData.withdrawals}
                />
              </div>
            </div>
            <div className={style.advanced}>
              <div className={style.item}>
                <div className={style.prop}>
                  BALANCE
                </div>
                <NumberFormat
                  className={style.value}
                  displayType="text"
                  prefix="$"
                  value={this.props.data.balance}
                />
              </div>
              <div className={style.item}>
                <div className={style.prop}>
                  TRADING VOLUME
                </div>
                <NumberFormat
                  className={style.value}
                  displayType="text"
                  prefix="$"
                  value={advancedData.volumeOfTrading}
                />
              </div>
              <div className={style.item}>
                <div className={style.prop}>
                  GAMING VOLUME
                </div>
                <NumberFormat
                  className={style.value}
                  displayType="text"
                  prefix="$"
                  value={advancedData.volumeOfGaming}
                />
              </div>
              <div className={style.item}>
                <div className={style.prop}>
                  TOTAL VOLUME
                </div>
                <NumberFormat
                  className={style.value}
                  displayType="text"
                  prefix="$"
                  value={advancedData.volumeOfTrading + advancedData.volumeOfGaming}
                />
              </div>
            </div>
          </div>
          <form
            noValidate
            ref={this.refOfForm}
          >
            {error}
            <table className={style.list}>
              <tbody>
                <Input
                  disabled={isXHR}
                  error={errors.username}
                  onChange={this.onChangeInput}
                  name="username"
                  title="USER NAME"
                  value={this.props.data.name}
                />
                <Input
                  disabled={isXHR}
                  error={errors.name}
                  onChange={this.onChangeInput}
                  name="name"
                  title="FIRST NAME"
                  value={getStringOr(advancedData.firstName)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.surname}
                  onChange={this.onChangeInput}
                  name="surname"
                  title="SURNAME"
                  value={getStringOr(advancedData.lastName)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.email}
                  onChange={this.onChangeInput}
                  name="email"
                  title="EMAIL"
                  value={this.props.data.email}
                />
                <Input
                  disabled={isXHR}
                  error={errors.dateOfBirth}
                  onChange={this.onChangeInput}
                  name="dateOfBirth"
                  maskOfNum="##/##/####"
                  title="DATE OF BIRTH"
                  value={getStringOr(advancedData.birthday)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.citizenship}
                  onChange={this.onChangeInput}
                  name="citizenship"
                  title="CITIZENSHIP"
                  value={getStringOr(advancedData.citizenship)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.city}
                  onChange={this.onChangeInput}
                  name="city"
                  title="CITY"
                  value={getStringOr(advancedData.city)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.code}
                  onChange={this.onChangeInput}
                  name="postalCode"
                  title="POSTAL CODE"
                  maskOfNum="##########"
                  value={getStringOr(advancedData.postalCode)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.address}
                  onChange={this.onChangeInput}
                  name="address"
                  title="ADDRESS"
                  value={getStringOr(advancedData.address)}
                />
                <Input
                  disabled={isXHR}
                  error={errors.phone}
                  onChange={this.onChangeInput}
                  name="phone"
                  maskOfNum="###############"
                  title="PHONE"
                  value={typeof advancedData.phone === 'number' ? '' + advancedData.phone : ''}
                />
              </tbody>
            </table>
          </form>
          <div className={style.bottom}>
            <table>
              <tbody>
                <tr>
                  <td>
                    <div className={style.text}>ID FRONT</div>
                  </td>
                  <td>
                    <input
                      hidden
                      disabled={isUploadFile}
                      id="id-front-upload"
                      onChange={this.onChangeDocOfProof}
                      name="ProofId"
                      type="file"
                    />
                    <label
                      className={classNameOfFilePicker}
                      htmlFor="id-front-upload"
                    >
                      {textOfFilePicker}
                    </label>
                  </td>
                  <td>
                    {typeof advancedData.idOfProof === 'string' && (
                      <a
                        data-an="idOfProof"
                        href="#!"
                        onClick={this.onClickToDoc}
                      >
                        [Click for preview]
                      </a>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <table>
              <tbody>
                <tr>
                  <td>
                    <div className={style.text}>
                      PROOF OF ADDRESS (Utility bill, bank statement, etc.)
                    </div>
                  </td>
                  <td>
                    <input
                      hidden
                      disabled={isUploadFile}
                      id="address-proof-upload"
                      onChange={this.onChangeDocOfProof}
                      name="ProofResidence"
                      type="file"
                    />
                    <label
                      className={classNameOfFilePicker}
                      htmlFor="address-proof-upload"
                    >
                      {textOfFilePicker}
                    </label>
                  </td>
                  <td>
                    {typeof advancedData.residenceOfProof === 'string' && (
                      <a
                        data-an="residenceOfProof"
                        href="#!"
                        onClick={this.onClickToDoc}
                      >
                        [Click for preview]
                      </a>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Fragment>
      );
    } else {
      content = <Spin />;
    }

    return (
      <div className={style.root}>
        <Modal
          className={style.previewModal}
          onClickToClose={this.onCloseModal}
          show={isPreviewDocMode}
        >
          <img
            src={srcOfPreviewDoc}
          />
        </Modal>
        {content}
      </div>
    );
  }
}

export default Settings;
