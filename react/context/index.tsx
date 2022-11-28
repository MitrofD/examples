import React from 'react';

const Context = React.createContext<TradeSettingContext.Value>(undefined);

export const withTradeSetting = <P extends object>(Component: React.ComponentType<P>): React.FC<Omit<P, keyof TradeSettingContext.Props>> => (props) => (
  <Context.Consumer>
    {(value) => (
      <Component
        {...props as P}
        tradeSetting={value}
      />
    )}
  </Context.Consumer>
);

export default Context;
