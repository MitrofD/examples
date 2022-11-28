declare namespace TradeSettingContext {
  type Value = Nullable<Trade.Setting> | undefined;

  type Props = {
    tradeSetting: Value;
  };
};
