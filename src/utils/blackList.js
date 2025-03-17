const customBlacklist = [
  "cocaina", "heroina", "metanfetamina", "marihuana", "extasis",
  "gonorrea", "carechimba", "hijueputa", "malparido", "guevón",
  "marica", "pirobo", "culicagado", "monda", "verga",
  "zunga", "peo", "mamahuevo", "guevonada", "sapo", "caremondá",
  "tragasables", "sisas", "culiao", "mariqueo"
];

// 🔸 Function to check if text contains blacklisted words
export function containsBlacklistedWord(text) {
  console.log("Checking for blacklisted words in text:", text);
  return customBlacklist.some((word) =>
    text.toLowerCase().includes(word.toLowerCase())
  );
}

export default containsBlacklistedWord;