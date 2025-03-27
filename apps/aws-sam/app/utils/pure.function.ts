export const division = <T>(arr: T[], n: number): T[][] => {
   if (arr.length === 0) return [[]];

   const temp = [...arr];
   const len = arr.length;
   const cnt = Math.floor(len / n) + (Math.floor(len % n) > 0 ? 1 : 0);
   const result = [];

   for (let i = 0; i < cnt; i++) {
      result.push(temp.splice(0, n));
   }

   return result;
};
