declare namespace WithMega5 {
  type Data = Mega5.Data | null | Error;

  type Props = {
    mega5: Data;
  };
};
