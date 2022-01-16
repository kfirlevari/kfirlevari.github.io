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
//var selected_name;

const nodeWidth = 250;
const nodeHeight = 30;

var zoom = {
  scaleFactor: 1.1,
};

var svg;
var point;
var viewBox;

d3.select("#myCheckbox").on("change", set_wikipreview_state);

function set_wikipreview_state() {
    if (d3.select("#myCheckbox").property("checked")) {
        d3.select(".popup-container")
            .style('display', 'block');
    } else {
        d3.select(".popup-container").style('display', 'none');
    }
}

function onWheel(event) {
    
  event.preventDefault();
    
  var normalized;  
  var delta = event.wheelDelta;

  if (delta) {
    normalized = (delta % 120) == 0 ? delta / 120 : delta / 12;
  } else {
    delta = event.deltaY || event.detail || 0;
    normalized = -(delta % 3 ? delta * 10 : delta / 3);
  }
  
  var scaleDelta = normalized > 0 ? 1 / zoom.scaleFactor : zoom.scaleFactor;
  
  point.x = event.clientX;
  point.y = event.clientY;
  
  var startPoint = point.matrixTransform(svg.getScreenCTM().inverse());
    
  var fromVars = {
    x: viewBox.x,
    y: viewBox.y,
    width: viewBox.width,
    height: viewBox.height,
  };
  
  viewBox.x -= (startPoint.x - viewBox.x) * (scaleDelta - 1);
  viewBox.y -= (startPoint.y - viewBox.y) * (scaleDelta - 1);
  viewBox.width *= scaleDelta;
  viewBox.height *= scaleDelta;
}

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
            .nodeSize((node) => [(node ? 1.35 : 0.4) * nodeWidth, 4 * nodeHeight]);
    }

    const dagLayoutDim = layout(dag);
    dagWidth = dagLayoutDim.width
    dagHeight = dagLayoutDim.height
    svgSelection = d3.select("svg");
    svgSelection.selectAll('*').remove();
    svgSelection.attr("width", 200);
    heightByDagHeight = {}
    heightByDagHeight[1] = 60;
    heightByDagHeight[2] = heightByDagHeight[1];
    heightByDagHeight[3] = heightByDagHeight[1];
    heightByDagHeight[4] = dag.size() < 15 ? 120 : 150;
    heightByDagHeight[5] = heightByDagHeight[4];
    heightByDagHeight[6] = heightByDagHeight[4];
    heightByDagHeight[7] = heightByDagHeight[4];
    svgHeight = dag.height().value < 8 ? heightByDagHeight[dag.height().value] : 150;
    
    svgSelection.attr("height", svgHeight);
    svgSelection.attr("viewBox", [0, 0, dagWidth, dagHeight].join(" "));
    allDagNodes = dag.descendants();

    svg = svgSelection.node();
    svg.addEventListener("wheel", onWheel, { passive: false });
    point = svg.createSVGPoint();
    viewBox = svg.viewBox.baseVal;

    setup_drag();
}

const setup_drag = function() {

    // If browser supports pointer events
    if (window.PointerEvent) {
        svg.addEventListener('pointerdown', onPointerDown); // Pointer is pressed
        svg.addEventListener('pointerup', onPointerUp); // Releasing the pointer
        svg.addEventListener('pointerleave', onPointerUp); // Pointer gets out of the SVG area
        svg.addEventListener('pointermove', onPointerMove); // Pointer is moving
    } else {
        // Add all mouse events listeners fallback
        svg.addEventListener('mousedown', onPointerDown); // Pressing the mouse
        svg.addEventListener('mouseup', onPointerUp); // Releasing the mouse
    svg.addEventListener('mouseleave', onPointerUp); // Mouse gets out of the SVG area
    svg.addEventListener('mousemove', onPointerMove); // Mouse is moving

    // Add all touch events listeners fallback
    svg.addEventListener('touchstart', onPointerDown); // Finger is touching the screen
    svg.addEventListener('touchend', onPointerUp); // Finger is no longer touching the screen
    svg.addEventListener('touchmove', onPointerMove); // Finger is moving
}

    // Create an SVG point that contains x & y values
    var point = svg.createSVGPoint();
    // This function returns an object with X & Y values from the pointer event
    function getPointFromEvent (event) {
        
        // If even is triggered by a touch event, we get the position of the first finger
        if (event.targetTouches) {
            point.x = event.targetTouches[0].clientX;
            point.y = event.targetTouches[0].clientY;
        } else {
            point.x = event.clientX;
            point.y = event.clientY;
        }
        
        // We get the current transformation matrix of the SVG and we inverse it
        var invertedSVGMatrix = svg.getScreenCTM().inverse();
        
        return point.matrixTransform(invertedSVGMatrix);
    }

    // This variable will be used later for move events to check if pointer is down or not
    var isPointerDown = false;

    // This variable will contain the original coordinates when the user start pressing the mouse or touching the screen
    var pointerOrigin;

    // Function called by the event listeners when user start pressing/touching
    function onPointerDown(event) {
        isPointerDown = true; // We set the pointer as down
        
        // We get the pointer position on click/touchdown so we can get the value once the user starts to drag
        pointerOrigin = getPointFromEvent(event);
    }

    // We save the original values from the viewBox
    var viewBox = svg.viewBox.baseVal;

    // Function called by the event listeners when user start moving/dragging
    function onPointerMove (event) {
        // Only run this function if the pointer is down
        if (!isPointerDown) {
            return;
        }
        // This prevent user to do a selection on the page
        event.preventDefault();

        // Get the pointer position as an SVG Point
        var pointerPosition = getPointFromEvent(event);

        // Update the viewBox variable with the distance from origin and current position
        // We don't need to take care of a ratio because this is handled in the getPointFromEvent function
        viewBox.x -= (pointerPosition.x - pointerOrigin.x);
        viewBox.y -= (pointerPosition.y - pointerOrigin.y);
}

function onPointerUp() {
  // The pointer is no longer considered as down
  isPointerDown = false;
}
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

    svgSelection.attr('class', 'draggable');
    
    // Select nodes
    nodes = svgSelection
        .append("g")
        .selectAll("g")
        .data(allDagNodes)
        .enter()
        .append("g")
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .attr("id", "node_g")
        .attr('class', 'static')
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
        .attr('data-wp-title', (n) => n.data.wpTitle)
        .attr('class', "wiki")

    
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
        .attr('data-wp-title', (n) => n.data.wpTitle)
        .attr('class', "wiki")

        
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

    wikipediaPreview.init({
        root: document.querySelector('.content'),
        selector: '.wiki',
        popupContainer: document.querySelector('.popup-container'),
    });

    set_wikipreview_state();
    
    //if (typeof selected_name !== 'undefined') {
    //    console.log(selected_name)
    //}
    //console.log(nodes.size())
}
const plot_full_graph = function() {
    init_dag(full_json_data, '0')
    draw_dag()
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

const plot_graph_for_selection = function(currentSelectedNode) {
    d3.select("#search").property("value", currentSelectedNode.data.name);
    const descendatnsAndParentsIDs = new Set()
    descendatnsAndParentsIDs.add(currentSelectedNode.data.id)
    for (const [i, descendantNode] of currentSelectedNode.descendants().entries()) {
        if (descendantNode.data.parentIds.includes(currentSelectedNode.data.id)) {
            descendatnsAndParentsIDs.add(descendantNode.data.id)
        }
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
        newDagData = newDagData.concat(clone(nodeIdToJSONObj.get(i))) 
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
    if (newDagData.length < 12) {
        init_dag(newDagData, '2')
    } else  {
        init_dag(newDagData, '0')
    }
    //selected_name = currentSelectedNode.data.name;
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

const node_mouseout = function() {
   
}

const node_mouseover = function() {
    url_to_present = this.__data__.data.url;    
}

const node_click = function() {
    d3.select('.wp-popup').style('visibility', 'hidden').attr('currentTargetElement', '');    
    const currentSelectedNode = allDataNodes.find((n) => n.data.id === this.__data__.data.id);
    plot_graph_for_selection(currentSelectedNode);
}

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
        nodeWidth,
        nodeHeight * 2
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
