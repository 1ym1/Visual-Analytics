document.addEventListener("DOMContentLoaded", function () {

    const svg = d3.select("svg");
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const path = d3.geoPath();

    // Scales for bubbles
    const sizeScale = d3.scaleSqrt().range([0, 60]); // Keep map bubble size scale unchanged
    const colorScale = d3.scaleSequential(d3.interpolateBlues);

    // Load data
    Promise.all([
        d3.json("counties-albers-10m.json"), // GeoJSON for counties
        d3.csv("final_data.csv") // Data CSV
    ]).then(([us, debtData]) => {
        // Filter valid data
        const validData = debtData.filter(d =>
            d['Annual Earnings'] !== undefined &&
            !isNaN(+d['Annual Earnings']) &&
            !isNaN(+d['debt'])
        );

        // Set initial sizeScale and colorScale domains
        sizeScale.domain([0, d3.max(validData, d => +d['debt'])]);
        colorScale.domain([0, d3.max(validData, d => +d['Annual Earnings'])]);

        // Populate filters
        populateFilters(validData, 'Institution Type', 'institutionTypeFilter');
        populateFilters(validData, 'Official Program Pass/Zone/Fail', 'programFilter');
        populateFilters(validData, 'Field Study Grouped', 'fieldFilter');

        // Draw initial map and visualization
        drawMapAndVisualization(validData);

        // Add legends
        drawColorLegend(colorScale);
        drawSizeLegend(sizeScale);

        // Add filter change event listener
        d3.selectAll("#filters select").on("change", function () {
            updateVisualization(validData);
        });

        function drawMapAndVisualization(data) {
            const debtByFIPS = new Map(data.map(d => {
                const stateFIPS = d['state fips code'].padStart(2, '0');
                const countyFIPS = d['county fips code'].padStart(3, '0');
                const fullFIPS = stateFIPS + countyFIPS;
                return [fullFIPS, { debt: +d['debt'], earnings: +d['Annual Earnings'] }];
            }));

            const counties = topojson.feature(us, us.objects.counties).features;

            // Draw bubbles
            svg.selectAll(".bubble")
                .data(counties)
                .join("circle")
                .attr("class", "bubble")
                .attr("transform", d => "translate(" + path.centroid(d) + ")")
                .attr("r", d => {
                    const data = debtByFIPS.get(d.id);
                    return data ? sizeScale(data.debt) : 0;
                })
                .attr("fill", d => {
                    const data = debtByFIPS.get(d.id);
                    return data ? colorScale(data.earnings) : "#ccc"; // Default color if no data
                })
                .on("click", function () {
                    d3.selectAll(".bubble").attr("stroke", "none");
                    d3.select(this).attr("stroke", "#ff0000").attr("stroke-width", 3);
                })
                .append("title")
                .text(d => {
                    const data = debtByFIPS.get(d.id);
                    return data
                        ? `${d.properties.name}: Debt: $${data.debt}, Earnings: $${data.earnings}`
                        : `${d.properties.name}: No data`;
                });

            // Draw state borders
            const states = topojson.feature(us, us.objects.states).features;
            svg.selectAll(".state")
                .data(states)
                .join("path")
                .attr("class", "state")
                .attr("d", path)
                .attr("stroke", "#000")
                .attr("stroke-width", 1.5);
        }

        function updateVisualization(data) {
            // Get filter values
            const institutionType = d3.select("#institutionTypeFilter").property("value");
            const program = d3.select("#programFilter").property("value");
            const field = d3.select("#fieldFilter").property("value");

            // Filter data based on selections
            const filteredData = data.filter(d =>
                (institutionType === "All" || d['Institution Type'] === institutionType) &&
                (program === "All" || d['Official Program Pass/Zone/Fail'] === program) &&
                (field === "All" || d['Field Study Grouped'] === field)
            );

            // Update sizeScale and colorScale domains with filtered data
            sizeScale.domain([0, d3.max(filteredData, d => +d['debt'])]);
            colorScale.domain([0, d3.max(filteredData, d => +d['Annual Earnings'])]);

            // Redraw map and bubbles with filtered data
            drawMapAndVisualization(filteredData);
        }

        function drawColorLegend(colorScale) {
            const legendWidth = 300;
            const legendHeight = 20;

            const legend = svg.append("g")
                .attr("transform", `translate(${width - legendWidth -15}, ${height-80})`); // Positioned further to the right

            const legendScale = d3.scaleLinear()
                .domain(colorScale.domain())
                .range([0, legendWidth]);

            const legendAxis = d3.axisBottom(legendScale).ticks(5);

            legend.append("defs")
                .append("linearGradient")
                .attr("id", "colorLegendGradient")
                .selectAll("stop")
                .data(colorScale.ticks(10).map((t, i, n) => ({
                    offset: `${(100 * i) / (n.length - 1)}%`,
                    color: colorScale(t)
                })))
                .enter().append("stop")
                .attr("offset", d => d.offset)
                .attr("stop-color", d => d.color);

            legend.append("rect")
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#colorLegendGradient)");

            legend.append("g")
                .attr("transform", `translate(0, ${legendHeight})`)
                .call(legendAxis);
        }

        function drawSizeLegend(sizeScale) {
            const legend = svg.append("g")
                .attr("transform", `translate(${width - 50}, ${height - 90})`); // Positioned to the extreme right

            const legendValues = [8000, 50000, 200000]; // Example debt values for the legend
            const scaleFactor = 1 / 6; // Reduced size legend circles by 6 times

            legend.selectAll("circle")
                .data(legendValues)
                .enter().append("circle")
                .attr("cx", 0)
                .attr("cy", d => -sizeScale(d) * scaleFactor)
                .attr("r", d => sizeScale(d) * scaleFactor) // Reduce circle radius by 6 times
                .attr("fill", "none")
                .attr("stroke", "black"); // Black stroke for better visibility

            legend.selectAll("text")
                .data(legendValues)
                .enter().append("text")
                .attr("x", 0)
                .attr("y", d => -sizeScale(d) * scaleFactor * 2)
                .attr("dy", "1.2em")
                .style("text-anchor", "middle")
                .style("font-size", "8px") // Smaller font for size legend
                .text(d => `${d / 1e6}M`);
        }
    }).catch(error => console.error('Error loading data:', error));

    function populateFilters(data, column, filterId) {
        const uniqueValues = Array.from(new Set(data.map(d => d[column]))).filter(d => d);
        const select = d3.select(`#${filterId}`);
        uniqueValues.forEach(value => {
            select.append("option").attr("value", value).text(value);
        });
    }
});
