function formatGoogleSheetData(csvString: string) {
  const rows = csvString.split("\n");
  let shortNameRowIdx = rows.findIndex(
    (row) => !row.includes("-") && row.toLowerCase().includes("geoid") && !row.includes(" ")
  );
  if (shortNameRowIdx === -1) {
    shortNameRowIdx = rows.findIndex(
      (row) => !row.includes("-") && row.toLowerCase().includes("geoid")
    );
  }
  if (!rows[shortNameRowIdx] || !rows[shortNameRowIdx].split) {
    console.error("No short name row found", csvString);
  }
  const headerShortNames = rows[shortNameRowIdx].toLowerCase()
    .split(",")
    .map((header) => header.trim());
  const labelRowIdx = 1 - shortNameRowIdx; //If shortNameRowIdx is 0, then labelRowIdx is 1, if shortNameRowIdx is 1, then labelRowIdx is 0
  const headerLabels = rows[labelRowIdx]
    .split(",")
    .map((header) => header.trim());

  const data = rows.slice(2).map((row) => {
    const values = row
      .split(",")
      .map((value, index) =>
        index !== headerShortNames.indexOf("geoid")
          ? value.trim()
          : value.trim().toLowerCase()
      )
      .map((value: string) => {
        if (!value || value.length === 0) {
          return undefined;
        }
        return !isNaN(Number(value)) && value.includes(".")
          ? Number(value).toFixed(2)
          : value;
      });

    return headerShortNames.reduce(
      (acc: Record<string, string | undefined>, header: string, index: number) => {
        acc[header] = values[index] || undefined;
        return acc;
      },
      {} as Record<string, string | undefined>
    );
  });
  //IPUMS data has extra zeros in the geoid, we need to remove them
  data.forEach((row) => {
    if (
      row.geoid &&
      (row.geoid.includes("005700") || row.geoid.includes("002300"))
    ) {
      // Using split/join to ensure compatibility with older JS/TS targets (replaceAll not supported in ES5)
      row.geoid = row.geoid
        .split("G")
        .join("")
        .split("g")
        .join("")
        .split("005700")
        .join("0570")
        .split("002300")
        .join("0230");
    }
  });

  return {
    headerLabels,
    headerShortNames,
    data,
  };
}

export { formatGoogleSheetData };
