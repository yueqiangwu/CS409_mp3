// module.exports = function (query) {
//   const { where, sort, select, skip, limit, count } = query;
//   let where_ = {};
//   if (where !== undefined) {
//     try {
//       where_ = JSON.parse(where);
//     } catch (err) {
//       throw new Error(`invalid params where: ${where}`);
//     }
//   }
//   let sort_ = {};
//   if (sort !== undefined) {
//     try {
//       sort_ = JSON.parse(sort);
//     } catch (err) {
//       throw new Error(`invalid params sort: ${sort}`);
//     }
//   }
//   let select_ = {};
//   if (select !== undefined) {
//     try {
//       select_ = JSON.parse(select);
//     } catch (err) {
//       throw new Error(`invalid params select: ${select}`);
//     }
//   }
//   if (skip !== undefined) {
//     if (typeof skip !== 'number' || skip < 0) {
//       throw new Error(`invalid params skip: ${skip}`);
//     }
//   }
//   if (limit !== undefined) {
//     if (typeof limit !== 'number' || limit < 0) {
//       throw new Error(`invalid params limit: ${limit}`);
//     }
//   }
//   let count_ = false;
//   if (count !== undefined) {
//     if (typeof count !== 'string') {
//       throw new Error(`invalid params count: ${count}`);
//     }
//     count_ = count.toLowerCase() === 'true';
//   }
//   return { where: where_, sort: sort_, select: select_, skip, limit, count: count_ };
// };

module.exports = function (query) {
  const { where, sort, select, skip, limit, count } = query;
  let skip_ = undefined;
  if (skip !== undefined) {
    try {
      skip_ = parseInt(skip);
    } catch (err) {
      throw new Error(`invalid params skip: ${skip}`);
    }
  }
  let limit_ = undefined;
  if (limit !== undefined) {
    try {
      limit_ = parseInt(limit);
    } catch (err) {
      throw new Error(`invalid params limit: ${limit}`);
    }
  }
  let count_ = false;
  if (count !== undefined) {
    count_ = count.toLowerCase() === 'true';
  }
  return { where, sort, select, skip: skip_, limit: limit_, count: count_ };
};
