var fuse;
var currentFocus;
var edges;
var nodes;
var arrows;
var dag;
var colorMap;
var allDagNodes;
var allDataNodes;
var svgSelection;
var dagWidth;
var dagHeight;
var nodeIdToJSONObj;
var full_json_data;

const nodeWidth = 250;
const nodeHeight = 30;


function addActive(x) {
    if (!x) return false;
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    x[currentFocus].classList.add("autocomplete-active");
}

function removeActive(x) {
    for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
    }
}

function closeAllLists(elmnt) {
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != d3.select("#search")) {
            x[i].parentNode.removeChild(x[i]);
        }
    }
}

d3.select("#search").on('input', function(event) {
    if (event.target.value.length < 2) {
        closeAllLists();
        //reset_rects();
        //        reset_visible_and_active();
        return;
    }
    const result = fuse.search(event.target.value);
    var a, b, i, val = this.value;
    closeAllLists();
    if (!result) { return;}
    currentFocus = -1;
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(a);
    for (i = 0; i < result.length; i++) {
        b = document.createElement("DIV");
        b.innerHTML = "<strong>" + result[i].item.name + "</strong> ";
        if (result[i].item.other_names) {
            b.innerHTML += result[i].item.other_names;
        }
        b.innerHTML += "<input type='hidden' value='" + result[i].item.name + "'>";
        b.addEventListener("click", function(e) {
            var data_name = this.getElementsByTagName('strong')[0].innerText;
            d3.select("#search").property("value", data_name);
            closeAllLists();
            plot_graph_for_selection(allDataNodes.find((n) => n.data.name === data_name))
        });
        a.appendChild(b);
    }
});

d3.select("#search").on("keydown", function(e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
        currentFocus++;
        addActive(x);
    } else if (e.keyCode == 38) { //up
        currentFocus--;
        addActive(x);
    } else if (e.keyCode == 13) {
        e.preventDefault();
        if (currentFocus > -1) {
            if (x) x[currentFocus].click();
        }
    }
});

const reset_rects = function() {
    nodes.selectAll('rect')
        .style('fill', n => colorMap.get(n.data.id))
        .style('stroke', n => colorMap.get(n.data.id))
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', -nodeWidth/2.0)
        .attr('y', -nodeHeight/2.0)
        .attr('rx', nodeHeight/2.0)
        .attr('ry', nodeHeight/2.0)
}

const reset_visible_and_active = function() {
    nodes.classed("active", false)
        .style("visibility", "visible");
    edges.style("visibility", "visible");
    arrows.style("visibility", "visible");
    svgSelection.attr("viewBox", [0, 0, dagWidth, dagHeight].join(" "));
}


const init_dag = function(data, layout_type) {
    dag = d3.dagStratify()(data);

    var layout;
    if (layout_type == '0'){
        layout = gridTweak(gridCompact(d3.grid()));
    } else if (layout_type == '1') {
        layout = gridTweak(gridCompact(d3.grid().lane(d3.laneGreedy().topDown(false))));
    } else {
        layout = d3
            .sugiyama() // base layout
            .decross(d3.decrossOpt()) // minimize number of crossings
            .nodeSize((node) => [(node ? 1.35 : 0.4) * nodeWidth, 5 * nodeHeight]);
    }

    const dagLayoutDim = layout(dag);
    dagWidth = dagLayoutDim.width
    dagHeight = dagLayoutDim.height
    svgSelection = d3.select("svg");
    svgSelection.selectAll('*').remove();
    svgSelection.attr("width", 100);
    svgSelection.attr("height", 50);
    svgSelection.attr("viewBox", [0, 0, dagWidth, dagHeight].join(" "));
    allDagNodes = dag.descendants();
}

const draw_dag = function() {
    const defs = svgSelection.append("defs"); // For gradients
    
    const line = d3
          .line()
          .curve(d3.curveCatmullRom)
          .x((d) => d.x)
          .y((d) => d.y);

    // Plot edges
    edges = svgSelection
        .append("g")
        .selectAll("path")
        .data(dag.links())
        .enter()
        .append("path")
        .attr("d", ({ points }) => line(points))
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .attr("stroke", ({ source, target }) => {
            // encodeURIComponents for spaces, hope id doesn't have a `--` in it
            const gradId = encodeURIComponent(`${source.data.id}--${target.data.id}`);
            const grad = defs
                  .append("linearGradient")
                  .attr("id", gradId)
                  .attr("gradientUnits", "userSpaceOnUse")
                  .attr("x1", source.x)
                  .attr("x2", target.x)
                  .attr("y1", source.y)
                  .attr("y2", target.y);
            grad
                .append("stop")
                .attr("offset", "0%")
                .attr("stop-color", colorMap.get(source.data.id));
            grad
                .append("stop")
                .attr("offset", "100%")
                .attr("stop-color", colorMap.get(target.data.id));
            return `url(#${gradId})`;
        })
    
    // Select nodes
    nodes = svgSelection
        .append("g")
        .selectAll("g")
        .data(allDagNodes)
        .enter()
        .append("g")
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .attr("id", "node_g") 
        .on('click', node_click)
    
    // Plot nodes
    nodes
        .append('rect')
        .attr('x', -nodeWidth/2.0)
        .attr('y', -nodeHeight/2.0)
        .attr('rx', nodeHeight/2.0)
        .attr('ry', nodeHeight/2.0)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('fill', n => colorMap.get(n.data.id))
        .attr('stroke', n => colorMap.get(n.data.id))
    
    const arrow = d3.symbol().type(d3.symbolTriangle).size( nodeHeight * nodeHeight / 6.0);
    arrows = svgSelection.append('g')
        .selectAll('path')
        .data(dag.links())
        .enter()
        .append('path')
        .attr('d', arrow)
        .attr('transform', ({
            source,
            target,
            points
        }) => {
            const [end, start] = points.slice().reverse();
            const dx = start.x - end.x;
            const dy = start.y - end.y;
            const scale = nodeHeight / Math.sqrt(dx * dx + dy * dy);
            // This is the angle of the last line segment
            const angle = Math.atan2(-dy, -dx) * 180 / Math.PI + 90;
            return `translate(${end.x + dx * scale}, ${end.y + dy * scale}) rotate(${angle})`;
        })
        .attr('fill', ({target}) => colorMap.get(target.data.id))
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5);
    
    function wordwrap(text, max) {
        var regex = new RegExp(".{0,"+max+"}(?:\\s|$)","g");
        var lines = [];
        var line; 
        while ((line = regex.exec(text))!="") {lines.push(line);} 
        return lines
    }
    
    // Add text to nodes
    nodes.append('text')
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .attr('text-anchor', 'middle')
        .attr('font-size', '20px')
        .attr('alignment-baseline', 'middle')
        .attr('fill', 'white')
        .text((d) => d.data.name)
    // To split the text to lines:
    //.each(function (d) {
    //    if (d.data.name!=undefined) {
    //      var lines = wordwrap(d.data.name, 15)
    //      for (var i = 0; i < lines.length; i++) {
    //         d3.select(this).append("tspan")
    //             .attr("dy", function(d) { 
    //                 return i * 20 })
    //             .attr("x",function(d) { 
    //                 return d.children1 || d._children1 ? -20 : 0; })
    //              .text(lines[i])
    //       }
    //    }
    //});
}
const plot_full_graph = function() {
    init_dag(full_json_data, '0')
    draw_dag()
}

const plot_graph_for_selection = function(currentSelectedNode) {
    d3.select("#search").property("value", currentSelectedNode.data.name);
    const descendatnsAndParentsIDs = new Set()
    for (const [i, descendantNode] of currentSelectedNode.descendants().entries()) {
        descendatnsAndParentsIDs.add(descendantNode.data.id)
    }
    var parentIDsToCheck = []
    parentIDsToCheck = parentIDsToCheck.concat(currentSelectedNode.data.parentIds);
    while (parentIDsToCheck.length > 0) {
        var parentNodeID = parentIDsToCheck.shift();
        parentNode = allDataNodes.find((n) => n.data.id === parentNodeID);
        descendatnsAndParentsIDs.add(parentNodeID)
        parentIDsToCheck = parentIDsToCheck.concat(parentNode.data.parentIds)
    }
    newDagData = []
    for (const i of descendatnsAndParentsIDs) {
        newDagData = newDagData.concat(nodeIdToJSONObj.get(i)) 
    }
    for (const node of newDagData) {
        var cleanParents = []
        for (const p of node.parentIds) {
            if (descendatnsAndParentsIDs.has(p)) {
                cleanParents = cleanParents.concat(p)
            }
        }
        node.parentIds = cleanParents;
    }
    if (newDagData.length < 35) {
        init_dag(newDagData, '2')
    } else  {
        init_dag(newDagData, '0')
    }
    draw_dag()

    d3.selectAll('rect')
        .filter(function() {
            return this.__data__.data.id == currentSelectedNode.data.id;
        })
        .style('fill', "red")
        .style('stroke', "black")
        .attr('width', 1.3 * nodeWidth)
        .attr('height',1.3 * nodeHeight)
        .attr('x', -nodeWidth/1.5)
        .attr('y', -nodeHeight/1.5)
        .attr('rx', nodeHeight/1.5)
        .attr('ry', nodeHeight/1.5)
}

const node_click = function() {
    const currentSelectedNode = allDataNodes.find((n) => n.data.id === this.__data__.data.id);
    plot_graph_for_selection(currentSelectedNode);
}

/*
  const node_click = function() {
  reset_rects();
  if (d3.select(this).classed("active")) {
  reset_visible_and_active();
  d3.select("#search").property("value", "");
  } else {
  nodes.classed("active", false)
  d3.select(this).classed("active", true)
  d3.select(this).selectAll('rect')
  .style('fill', "red")
  .style('stroke', "black")
  .attr('width', 1.3 * nodeWidth)
  .attr('height',1.3 * nodeHeight)
  .attr('x', -nodeWidth/1.5)
  .attr('y', -nodeHeight/1.5)
  .attr('rx', nodeHeight/1.5)
  .attr('ry', nodeHeight/1.5)

  d3.select("#search").property("value", this.__data__.data.name);
  const currentSelectedNode = allDagNodes.find((n) => n.data.id === this.__data__.data.id);
  const descendatnsAndParentsIDs = new Set()
  for (const [i, descendantNode] of currentSelectedNode.descendants().entries()) {
  descendatnsAndParentsIDs.add(descendantNode.data.id)
  }
  var parentIDsToCheck = []
  parentIDsToCheck = parentIDsToCheck.concat(currentSelectedNode.data.parentIds);
  while (parentIDsToCheck.length > 0) {
  var parentNodeID = parentIDsToCheck.shift();
  parentNode = allDagNodes.find((n) => n.data.id === parentNodeID);
  descendatnsAndParentsIDs.add(parentNodeID)
  parentIDsToCheck = parentIDsToCheck.concat(parentNode.data.parentIds)
  }

  minX = -1;
  minY = -1;
  maxX = -1;
  maxY = -1;
  // Show parents and descendant nodes
  nodes.style("visibility", function(g) {
  if (descendatnsAndParentsIDs.has(g.data.id)) {
  if (minX == -1 || minX > g.x) {
  minX = g.x
  }
  if (minY == -1 || minY > g.y) {
  minY = g.y
  }
  if (maxX == -1 || maxX < g.x) {
  maxX = g.x
  }
  if (maxY == -1 || maxY < g.y) {
  maxY = g.y
  }
  return "visible";
  }
  return "hidden";
  });
  
  // Show only descendant edges
  edges.style("visibility", function(g) {
  if (descendatnsAndParentsIDs.has(g.source.data.id) && descendatnsAndParentsIDs.has(g.target.data.id)) { 
  return "visible";
  }
  return "hidden";
  });

  // Show only descendant arrows
  arrows.style("visibility", function(g) {
  if (descendatnsAndParentsIDs.has(g.source.data.id) && descendatnsAndParentsIDs.has(g.target.data.id)) { 
  return "visible";
  }
  return "hidden";
  });
  svgSelection.attr("viewBox", [0, 0, dagWidth, maxY + nodeHeight].join(" "));
  }
  }
*/

gridTweak = (layout) => (dag) => {
    // Tweak allows a basis interpolation to curve the lines
    // We essentially take the three point lines and make them five, with two points on either side of the bend
    const { width, height } = layout(dag);
    for (const { points } of dag.ilinks()) {
        const [first, middle, last] = points;
        if (last !== undefined) {
            points.splice(
                0,
                3,
                first,
                {
                    x: middle.x + Math.sign(first.x - middle.x) * nodeWidth,
                    y: middle.y
                },
                middle,
                { x: middle.x, y: middle.y + nodeHeight },
                last
            );
        }
    }
    return { width, height };
}

gridCompact = (layout) => (dag) => {
    // Tweak to render compact grid, first shrink x width by edge radius, then expand the width to account for the loss
    // This could alos be accomplished by just changing the coordinates of the svg viewbox.
    const baseLayout = layout.nodeSize([
        nodeWidth * 1.1,
        nodeHeight * 1.1
    ]);
    const { width, height } = baseLayout(dag);
    for (const node of dag) {
        node.x += nodeWidth;
    }
    for (const { points } of dag.ilinks()) {
        for (const point of points) {
            point.x += nodeWidth;
        }
    }
    return { width: width + nodeWidth, height: height };
}

d3.json("/assets/datasets/ml-world.json").then(function(data) {
    full_json_data = data;
    nodeIdToJSONObj = new Map();
    for (var i = 0; i < data.length; i++) {
        var obj = data[i]
        nodeIdToJSONObj.set(obj.id, obj);   
    }
    
    const options = {
        includeScore: true,
        keys: ['name', 'other_names']
    }

    fuse = new Fuse(data, options)
    
    init_dag(full_json_data, '0')
    allDataNodes = allDagNodes
    const steps = dag.size();
    const interp = d3.interpolateRainbow;
    colorMap = new Map();
    for (const [i, node] of allDataNodes.entries()) {
        colorMap.set(node.data.id, interp(i / steps));
        node.data.node = node;
    }
    
    draw_dag()
});

