export const getSliderMarks = (values: number[]) =>
  values
    .filter((value, index) => values.indexOf(value) === index)
    .map((value) => ({ label: String(value), value }));
