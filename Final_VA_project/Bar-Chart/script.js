// Global variables
let data;
let comparisonMode = false;
const margin = { top: 40, right: 200, bottom: 40, left: 200 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

async function init() {
    try {
        const response = await fetch('data/dataset.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                data = results.data;
                processData();
                setupFilters(1);
                setupFilters(2);
                updateVisualization(1);
                setupComparisonMode();
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
            }
        });
    } catch (error) {
        console.error('Error in initialization:', error);
        d3.select('#visualization1')
            .html(`<div style="color: red; padding: 20px;">
                Error loading data: ${error.message}
            </div>`);
    }
}

function processData() {
    data.forEach(d => {
        const safeNumber = (val) => {
            if (typeof val === 'string') {
                val = val.replace(/,/g, '');
            }
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        const metrics = [
            'Recipients Q1', 'Recipients Q2', 'Recipients Q3', 'Recipients Q4',
            'Loans Originated Q1', 'Loans Originated Q2', 'Loans Originated Q3', 'Loans Originated Q4'
        ];
        
        metrics.forEach(metric => {
            d[metric] = safeNumber(d[metric]);
        });

        d['Total Recipients'] = d['Recipients Q1'] + d['Recipients Q2'] + 
                              d['Recipients Q3'] + d['Recipients Q4'];
        d['Total Loans'] = d['Loans Originated Q1'] + d['Loans Originated Q2'] + 
                          d['Loans Originated Q3'] + d['Loans Originated Q4'];
    });
}

function setupComparisonMode() {
    d3.select('#compareToggle').on('click', () => {
        comparisonMode = !comparisonMode;
        d3.select('#chart2Section').style('display', comparisonMode ? 'block' : 'none');
        if (comparisonMode) {
            updateVisualization(2);
        }
        d3.select('.visualization-container')
            .style('flex-direction', comparisonMode ? 'row' : 'column');
    });
}

function setupFilters(chartNum) {
    const states = [...new Set(data.map(d => d.State))].sort();
    const schoolTypes = [...new Set(data.map(d => d['School Type']))].sort();
    const metrics = [
        'Recipients Q1', 'Recipients Q2', 'Recipients Q3', 'Recipients Q4',
        'Loans Originated Q1', 'Loans Originated Q2', 'Loans Originated Q3', 'Loans Originated Q4'
    ];

    const stateSelect = d3.select(`#stateFilter${chartNum}`);
    const typeSelect = d3.select(`#schoolTypeFilter${chartNum}`);
    const metricSelect = d3.select(`#metricSelect${chartNum}`);

    stateSelect.selectAll('*').remove();
    typeSelect.selectAll('*').remove();
    metricSelect.selectAll('*').remove();

    stateSelect.append('option')
        .text('All States')
        .attr('value', 'all');
    stateSelect.selectAll('option.state')
        .data(states)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d);

    typeSelect.append('option')
        .text('All Types')
        .attr('value', 'all');
    typeSelect.selectAll('option.type')
        .data(schoolTypes)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d);

    metricSelect.selectAll('option')
        .data(metrics)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d);

    stateSelect.on('change', () => updateVisualization(chartNum));
    typeSelect.on('change', () => updateVisualization(chartNum));
    metricSelect.on('change', () => updateVisualization(chartNum));
    d3.select(`#rangeSelect${chartNum}`).on('change', () => updateVisualization(chartNum));
    d3.select(`#axisLimit${chartNum}`).on('input', () => updateVisualization(chartNum));
}

function getVisualizationConfig(chartNum) {
    return {
        state: d3.select(`#stateFilter${chartNum}`).property('value'),
        type: d3.select(`#schoolTypeFilter${chartNum}`).property('value'),
        metric: d3.select(`#metricSelect${chartNum}`).property('value'),
        range: d3.select(`#rangeSelect${chartNum}`).property('value'),
        axisLimit: d3.select(`#axisLimit${chartNum}`).property('value')
    };
}

function updateVisualization(chartNum) {
    const config = getVisualizationConfig(chartNum);
    const containerId = `#visualization${chartNum}`;

    let filteredData = data.filter(d => {
        const stateMatch = config.state === 'all' || d.State === config.state;
        const typeMatch = config.type === 'all' || d['School Type'] === config.type;
        return stateMatch && typeMatch && d[config.metric] > 0;
    });

    filteredData = filteredData.sort((a, b) => config.range === 'top' ? 
        b[config.metric] - a[config.metric] : 
        a[config.metric] - b[config.metric]);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.select(containerId).html('');

    const svg = d3.select(containerId)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', Math.max(height, filteredData.length * 15) + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxValue = config.axisLimit && config.axisLimit > 0 ? 
        +config.axisLimit : 
        d3.max(filteredData, d => d[config.metric]);
    
    const x = d3.scaleLinear()
        .domain([0, maxValue])
        .nice()
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(filteredData.map(d => d.School))
        .range([0, filteredData.length * 15])
        .padding(0.1);

    const schoolTypeColors = {
        'PUBLIC': '#2b6cb0',    // Dark blue
        'PRIVATE': '#4299e1',   // Medium blue
        'PROPRIETARY': '#63b3ed', // Light blue
        'OTHER': '#F08080'      // Salmon
    };
    

    svg.append('g')
        .attr('class', 'x-axis')
        .call(d3.axisTop(x)
            .ticks(5)
            .tickFormat(d => {
                if (d >= 1e9) return (d/1e9).toFixed(1) + 'B';
                if (d >= 1e6) return (d/1e6).toFixed(1) + 'M';
                if (d >= 1e3) return (d/1e3).toFixed(1) + 'k';
                return d.toFixed(0);
            }));

    svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y));

    const bars = svg.selectAll('.bar')
        .data(filteredData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.School))
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(d[config.metric]))
        .style('fill', d => schoolTypeColors[d['School Type']] || '#F08080')

    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 20}, 0)`);

    Object.entries(schoolTypeColors).forEach(([type, color], i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .style('fill', color);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(type);
    });

    bars.on('mouseover', function(event, d) {
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        tooltip.html(`
            <strong>${d.School}</strong><br/>
            ${config.metric}: ${d[config.metric].toLocaleString()}<br/>
            State: ${d.State}<br/>
            Type: ${d['School Type']}<br/>
            Total Recipients: ${d['Total Recipients'].toLocaleString()}<br/>
            Total Loans: ${d['Total Loans'].toLocaleString()}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    });
}

window.addEventListener('load', init);