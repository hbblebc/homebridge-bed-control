// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface String {
  format(pre: string): string;
}

String.prototype.format = function (...args): string {
  // use replace to iterate over the string
  // select the match and check if the related argument is present
  // if yes, replace the match with the argument
  return this.replace(/{([0-9]+)}/g, (match, index) => {
    // check if the argument is present
    return typeof args[index] === 'undefined' ? match : args[index];
  });
};
