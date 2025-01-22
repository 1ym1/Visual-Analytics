// document.addEventListener('DOMContentLoaded', function() {
//     // Your function or code to execute when the document is ready
//     d3.csv("./data.csv").then(
//       arr => {
//         grouped_fields=arr.map(data => data["Field Study Grouped"]);
//         // const countMap = grouped_fields.reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map());
//         meanDebtObj=meanDebtPerField(arr);
//         createSpiderPlot(800,500, 6, new Map(Object.entries(meanDebtObj)));
//       }
//     );
// });

var filteredData=null;
var uniqueFieldsOfStudy=null;
var uniqueStates=null;
const svg=d3.select("#spider_plot")
  .append("svg")
  .attr("width", window.innerWidth*0.5)
  .attr("height", window.innerHeight*0.8);
var checkedColors={};
const definedColors=["231, 76, 60","155, 89, 182","93, 173, 226","69, 179, 157","46, 204, 113","241, 196, 15","230, 126, 34","189, 195, 199","127, 140, 141","52, 73, 94"]
  
function createSpiderPlot(n_spider_layers, data) {
  const n_variables = uniqueFieldsOfStudy.length

  width=svg.attr("width")
  height=svg.attr("height")
  // drawFrame(svg);
  // drawLine(svg, data);
  const center_x = width/2;
  const center_y = height/2
  const radius = Math.min(width, height)/2.6;
  drawCircle(svg, center_x, center_y, 3);
  // drawCircle(svg, center_x, center_y, radius);
  // drawPolygonOnCircle(svg, n_variables, center_x, center_y, radius);
  var max_value=0;
  for (const state in data){
    for (const field in data[state]){
      if (data[state][field]>max_value){
        max_value=data[state][field];
      }
    }
  }
  
  drawSpiderWeb(svg, n_spider_layers, n_variables, radius, center_x, center_y, max_value);
  drawRadiuses(svg, n_variables, center_x, center_y, radius);
  drawVariablesLabel(svg, n_variables, center_x, center_y, radius, uniqueFieldsOfStudy);
  for (const state in data){
    drawVariablesPolygon(svg, data[state], radius, center_x, center_y, max_value, checkedColors[state]);
  }
}

function drawLine(svg, data, color="steelblue", fill="none"){
  const line = d3.line()
      .x(d => d.x)  // x-coordinate of each point
      .y(d => d.y)  // y-coordinate of each point

  svg.append("path")
    .data([data])  // Pass the data as an array
    .attr("d", line)  // Generate the path
    .attr("fill", fill)
    .attr("stroke", color)  // Line color
    .attr("stroke-width", 2);  // Line thickness
}

function drawFrame(svg){
  const data = [
    { x: 0, y: 0 },
    { x: svg.attr("width"), y: 0 },
    { x: svg.attr("width"), y: svg.attr("height") },
    { x: 0, y:  svg.attr("height")},
    { x: 0, y: 0 }
  ];
  drawLine(svg, data);
}

function drawCircle(svg, center_x, center_y, r, color="steelblue"){
  svg.append("circle")
    .attr("cx", center_x)    // x-coordinate of the center (middle of the SVG)
    .attr("cy", center_y)    // y-coordinate of the center (middle of the SVG)
    .attr("r", r)      // radius of the circle
    .attr("fill", "none")  // No fill for the circle
    .attr("stroke", color)  // Border color
    .attr("stroke-width", 2);  // Border thickness
}

function drawPolygonOnCircle(svg, n_points, center_x, center_y, r){
  let intersectCoords = [];

  for (let i = 0; i<=n_points; i++){
    let angle = i*2*Math.PI/n_points+Math.PI/6;
    intersectCoords.push({x: center_x+r*Math.cos(angle), y: center_y+r*Math.sin(angle)});
  }
  drawLine(svg, intersectCoords);
  return intersectCoords
}

function drawRadiuses(svg, n_points, center_x, center_y, r){
  let intersectCoords = [];

  for (let i = 0; i<=n_points; i++){
    let angle = i*2*Math.PI/n_points+Math.PI/6;
    intersectCoords.push({x: center_x, y: center_y});
    intersectCoords.push({x: center_x+r*Math.cos(angle), y: center_y+r*Math.sin(angle)});
  }
  drawLine(svg, intersectCoords);
}

function drawSpiderWeb(svg, n_layers, n_points, max_radius, center_x, center_y, max_value){

  for (let i=0; i<=n_layers; i++){
    let radius = (max_radius/n_layers)*i;
    intersectCoords=drawPolygonOnCircle(svg, n_points, center_x, center_y, radius);
    for (const coords of intersectCoords) {
      x=coords["x"]
      y=coords["y"]
      valueToDisplay=((max_value/n_layers)*i).toFixed(0)
      drawText(svg, x, y, 14, valueToDisplay)
    }
  }
}

function drawText(svg, x, y, size, text, color="black"){
  svg.append("text")
    .attr("x", x)  // Horizontal position
    .attr("y", y)  // Vertical position
    .attr("font-size", `${size}px`)  // Set the font size
    .attr("font-family", "Arial")  // Set the font family
    .attr("fill", color)  // Set the text color
    .attr("text-anchor", "middle")  // Horizontally center the text
    .attr("dominant-baseline", "middle")  // Vertically center the text
    .text(text);  // The text content
}

function drawVariablesLabel(svg, n_points, center_x, center_y, r, variable_names){
  r=r+r*0.15
  for (let i = 0; i<=n_points; i++){
    let angle = i*2*Math.PI/n_points+Math.PI/6;
    drawText(svg, center_x+r*Math.cos(angle), center_y+r*Math.sin(angle), 20, variable_names[i]);
  }
}

function drawVariablesPolygon(svg, data, max_radius, center_x, center_y, max_value, variable_color){
  let intersectCoords = [];
  uniqueFields=Object.keys(data);

  function getCoords(i){
    let angle = i*2*Math.PI/uniqueFields.length+Math.PI/6;
    let r=(data[uniqueFields[i]]/max_value)*max_radius;
    return {
      polygon: {
        x: center_x+r*Math.cos(angle), 
        y: center_y+r*Math.sin(angle)
      },
      text: {
        x: center_x+(r+0.05*max_radius)*Math.cos(angle),
        y: center_y+(r+0.05*max_radius)*Math.sin(angle)
      }
    };
  }

  for (let i = 0; i<uniqueFields.length; i++){
    coords=getCoords(i);
    intersectCoords.push(coords.polygon);
    // drawText(svg, coords.text.x, coords.text.y, 12, data[uniqueFields[i]], RGBValuesToRGBCode(variable_color));
    drawCircle(svg, coords.polygon.x, coords.polygon.y, 2, color=variable_color);
  }
  intersectCoords.push(getCoords(0).polygon);
  drawLine(svg, intersectCoords, color=RGBValuesToRGBCode(variable_color), fill=RGBValuesToARGBCode(variable_color,0.5));
}

function meanDebtPerField(data, uniqueStates, uniqueFieldsOfStudy) {
  // Create an object to store the sums and counts per field

  const dataPerState={};
  [...uniqueStates.values(), "All"].forEach(state => {
    dataPerState[state]={};
    uniqueFieldsOfStudy.forEach(field => {
      dataPerState[state][field]={sum: 0, count:0};
    });
  });

  // Iterate through the array
  data.forEach(instance => {
    const dict = dataPerState[instance["State"]];
    dict[instance["Field Study Grouped"]].sum += parseFloat(instance["Debt (numerator)"]);
    dict[instance["Field Study Grouped"]].count += 1;

    dataPerState["All"][instance["Field Study Grouped"]].sum+=parseFloat(instance["Debt (numerator)"]);
    dataPerState["All"][instance["Field Study Grouped"]].count += 1;
  });

  // Compute the mean for each field
  const meanDebt = {};

  [...uniqueStates.values(), "All"].forEach(state => {
    meanDebt[state]={};
    uniqueFieldsOfStudy.forEach(field => {
      if (Math.round(dataPerState[state][field].count) == 0){
        meanDebt[state][field]=0
      }
      else{
        meanDebt[state][field]=Math.round(dataPerState[state][field].sum / dataPerState[state][field].count);
      }
        
    });
  });

  return meanDebt;
}

d3.csv("./data.csv").then(data => {

  // FC is an outlier
  filteredData = data.filter(d => d["Field Study Grouped"] && parseFloat(d["Debt-to-Earnings Annual Rate"]) > 0 && d["State"] != "FC");

  uniqueStates = Array.from(new Set(data.map(d => d.State))).sort();
  uniqueFieldsOfStudy = Array.from(new Set(data.map(d => d["Field Study Grouped"])));
  const stateSelector=document.getElementById("state-selector");

  uniqueStates.forEach(state => {
    const stateSelectionHtml=`
    <li class="d-flex flex-row">
        <input class="form-check-input" type="checkbox" value="" id="flexCheck${state}" style="margin-right: 1em;">
        <label class="form-check-label" for="flexCheck${state}">
            ${state}
        </label>
        <span class="dot mx-2"></span>
    </li>`;
    stateSelector.innerHTML += stateSelectionHtml;
  });
  drawSpiderPlot(filteredData, [], uniqueFieldsOfStudy);
  return filteredData;
});

function drawSpiderPlot(filteredData, stateList, uniqueFieldsOfStudy){

  // Initial rendering with all data
  var meanDebtObj=meanDebtPerField(filteredData, uniqueStates, uniqueFieldsOfStudy);
  var meanDebtObjFiltered={};

  Object.keys(meanDebtObj).forEach(state=>{
    if(Object.values(stateList).includes(state)){
      meanDebtObjFiltered[state]=meanDebtObj[state];
    }
  });
  createSpiderPlot(6, meanDebtObjFiltered);
}

function randomRGBCode(){
  const max=255;
  const min=0;
  rgb_codes=[]
  for (let i=0; i<3; i++){
    rgb_codes.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return `${rgb_codes[0]},${rgb_codes[1]},${rgb_codes[2]}`;
}

function RGBValuesToRGBCode(values){
  return `rgb(${values})`;
}

function RGBValuesToARGBCode(values, alpha){
  return `rgba(${values}, ${alpha})`;
}

const stateSelector=document.getElementById("state-selector");

// Add a change event listener to the container
stateSelector.addEventListener('change', () => {
  // Get all checked checkboxes within the container
  const checkedCheckboxes = stateSelector.querySelectorAll('input[type="checkbox"]:checked');
  checkedCheckboxes.forEach(checkbox=>{
    checkbox_label=(checkbox.id).split("flexCheck")[1];
    if (!Object.keys(checkedColors).includes(checkbox_label)){
      const available_colors = definedColors.filter((defined_color) => ! (Object.values(checkedColors).includes(defined_color)));
    
      if (available_colors.length > 0){
        checkedColors[checkbox_label]=available_colors[0];
      }
      else{
        checkedColors[checkbox_label]=randomRGBCode();
      }
      // checkbox.parentElement.style.backgroundColor = RGBValuesToRGBCode(checkedColors[checkbox_label]);
      checkbox.parentElement.children[2].style.backgroundColor = RGBValuesToRGBCode(checkedColors[checkbox_label]);
    }
  });

  const notCheckedCheckboxes = stateSelector.querySelectorAll('input[type="checkbox"]:not(:checked)');
  notCheckedCheckboxes.forEach(checkbox=>{
    checkbox_label=(checkbox.id).split("flexCheck")[1];
    if (Object.keys(checkedColors).includes(checkbox_label)){
      delete checkedColors[checkbox_label];
      // checkbox.parentElement.style.backgroundColor = "transparent";
      checkbox.parentElement.children[2].style.backgroundColor = "transparent";
    }
  })
  
  // Extract the ids of the checked checkboxes
  const checkedIds = Array.from(checkedCheckboxes).map(checkbox => (checkbox.id).split("flexCheck")[1]);
  svg.selectAll("*").remove();
  drawSpiderPlot(filteredData, checkedIds, uniqueFieldsOfStudy);
});