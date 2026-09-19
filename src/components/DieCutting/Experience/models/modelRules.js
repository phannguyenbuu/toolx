export const getRuleForChild = (childName, resizeRules) => {
  const axes = ["X", "Y", "Z"];
  const result = {};

  axes.forEach((axis) => {
    const rule = resizeRules?.[axis];

    if (!rule) {
      result[axis] = null;
      return;
    }

    if (rule[childName]) {
      result[axis] = rule[childName];
    } else {
      const baseName = childName.replace(/_[1-3]$/, "");
      result[axis] =
        baseName !== childName && rule[baseName] ? rule[baseName] : null;
    }
  });

  return result;
};
