export const createTextureArray = (size) => {
  return new Uint8Array(size * size);
};

export const createPalette = (size) => {
  let values = [];
  for (let i = 0; i < size; i++) {
    const val = Math.pow(i / size, 1 / 1.4) * 255;
    values.push(`rgb(${val}, ${val}, ${val})`);
  }
  return values;
};

function paletteClick(ev) {
  console.log(ev.target);
}

export const createCell = (palette, texture, x, y, res) => {
  return `<td class="texture-cell" style="background-color: ${
    palette[texture[res * y + x]]
  }"> </td>`;
};

export const renderTextureTable = (palette, texture, res) => {
  let table = "";
  for (let y = 0; y < res; y++) {
    table += "<tr>";
    for (let x = 0; x < res; x++) {
      table += createCell(palette, texture, x, y, res);
    }
    table += "</tr>";
  }
  return table;
};

export const renderPaletteTable = (palette) => {
  let tableRow = "<tr>";
  for (let x = 0; x < palette.length; x++) {
    tableRow += `<td class="texture-cell" style="background-color: ${palette[x]}"></td>`;
  }
  tableRow += "</tr>";
  return tableRow;
};

export const createHud = () => {
  const hudElem = document.getElementById("hud");

  const paletteElem = document.createElement("table");
  paletteElem.id = "palette";
  const paletteSize = 16;
  const palette = createPalette(paletteSize);
  paletteElem.innerHTML = renderPaletteTable(palette);
  paletteElem.addEventListener("click", paletteClick);
  hudElem.appendChild(paletteElem);

  const resolution = 16;
  const texture = createTextureArray(resolution);

  const textureElem = document.createElement("table");
  textureElem.id = "texture";
  hudElem.appendChild(textureElem);

  // textureElem.innerHTML = renderTextureTable(palette, texture, resolution)
};
