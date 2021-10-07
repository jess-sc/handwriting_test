
// Apple Pencil demo using Pressure.js

// Alternative method: https://github.com/quietshu/apple-pencil-safari-api-test

// If you want to go deeper into pointer events
// https://patrickhlauke.github.io/touch/
// https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure


/***********************
*       SETTINGS       *
************************/

// How sensitive is the brush size to the pressure of the pen?
var pressureMultiplier = 10;

// What is the smallest size for the brush?
var minBrushSize = 1;

// Higher numbers give a smoother stroke
var brushDensity = 5;

var showDebug = true;


var arr = [];
var timearr = [];
var mstimearr = [];

var nameNoSpaces = "";

// Jitter smoothing parameters
// See: http://cristal.univ-lille.fr/~casiez/1euro/
var minCutoff = 0.0001; // decrease this to get rid of slow speed jitter but increase lag (must be > 0)
var beta      = 1.0;  // increase this to get rid of high speed lag


/***********************
*       GLOBALS        *
************************/
var xFilter, yFilter, pFilter;
var inBetween;
var prevPenX = 0;
var prevPenY = 0;
var prevBrushSize = 1;
var amt, x, y, s, d;
var pressure = -2;
var drawCanvas, uiCanvas;
var isPressureInit = false;
var isDrawing = false;
var isDrawingJustStarted = false;
var x_vals = [];
var y_vals = [];


var penX_temp = 0;
var penY_temp = 0;
var brushSize_temp = 0;
var prevPenX_temp = 0;
var prevPenY_temp = 0;
var prevBrushSize_temp = 0;

var eraseEnable = false;
var undo_button;
var strokeColor = 100;

/***********************
*    DRAWING CANVAS    *
************************/
new p5(function(p) {

  p.setup = function() {

    // Filters used to smooth position and pressure jitter
    xFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    yFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    pFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);

    // prevent scrolling on iOS Safari
    disableScroll();

    //Initialize the canvas
    drawCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
    drawCanvas.id("drawingCanvas");
    drawCanvas.position(0, 75);
  }

  p.draw = function() {

    // Start Pressure.js if it hasn't started already
    if(isPressureInit == false){
      initPressure();
    }


    if(isDrawing) {
      // Smooth out the position of the pointer
      penX = xFilter.filter(p.mouseX, p.millis());
      penY = yFilter.filter(p.mouseY, p.millis());

      // What to do on the first frame of the stroke
      if(isDrawingJustStarted) {
        //console.log("started drawing");
        prevPenX = penX;
        prevPenY = penY;
      }

      // Smooth out the pressure
      pressure = pFilter.filter(pressure, p.millis());

      // Define the current brush size based on the pressure
      brushSize = minBrushSize + (pressure * pressureMultiplier);

      // Calculate the distance between previous and current position
      d = p.dist(prevPenX, prevPenY, penX, penY);

      if(d<100){

              x_vals.push(penX);
              y_vals.push(penY);
              // The bigger the distance the more ellipses
              // will be drawn to fill in the empty space
              inBetween = (d / p.min(brushSize,prevBrushSize)) * brushDensity;

              // Add ellipses to fill in the space
              // between samples of the pen position
              for(i=1;i<=inBetween;i++){
                amt = i/inBetween;
                s = p.lerp(prevBrushSize, brushSize, amt);
                x = p.lerp(prevPenX, penX, amt);
                y = p.lerp(prevPenY, penY, amt);
                p.noStroke();
                p.fill(strokeColor)
                p.ellipse(x, y, s);
              }

              // Draw an ellipse at the latest position
              p.noStroke();
              p.fill(strokeColor)
              p.ellipse(penX, penY, brushSize);

              // For undo_button save the values to temporary var
              penX_temp = penX;
              penY_temp = penY;
              brushSize_temp = brushSize;

              prevPenX_temp = prevPenX;
              prevPenY_temp = prevPenY;
              prevBrushSize_temp = brushSize;

              // Save the latest brush values for next frame
              prevBrushSize = brushSize;
              prevPenX = penX;
              prevPenY = penY;

              isDrawingJustStarted = false;
      }
    }
  }
}, "p5_instance_01");


new p5(function(p) {

  	p.setup = function() {
      uiCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
      uiCanvas.id("uiCanvas");
      uiCanvas.position(0, 75);
    }

  	p.draw = function() {

      uiCanvas.clear();

      if(showDebug){
        p.text("pressure = " + pressure, 10, 20);
        if (pressure != -2 && pressure != 0)
          {
            if (undo_button.elt.innerText == 'Erase'){
              arr.push(pressure);
              var date_push = new Date();
              timearr.push(date_push);

              //var date_ms_push = new Date.now();
              //mstimearr.push(date_ms_push);
            }
          }

        p.stroke(200,50);
        p.line(p.mouseX,0,p.mouseX,p.height);
        p.line(0,p.mouseY,p.width,p.mouseY);

        p.noStroke();
        p.fill(strokeColor)
        var w = p.width * pressure;
        p.rect(0, 0, w, 4);
      }
    }
}, "p5_instance_02");



function setup() {
  createCanvas(100, 100);

  undo_button = createButton('Erase');
  undo_button.position(0, 55);
  undo_button.mousePressed(toggleErase);

  button = createButton('Save file');
  button.position(0, 28);
  button.mousePressed(createFile);

  var name = prompt("Enter your participant ID and task ID.");

  //added this line to ignore whitespace in case
  //someone accidentally enters a space so the csv
  //will download right
  if (name != null)
  {
    nameNoSpaces = name.replace(/ /g,'');
  }
}

function toggleErase(){

  if (undo_button.elt.innerText == 'Erase') {
    undo_button.elt.innerText = 'Draw';
    strokeColor = 255;
  }
  else {
    undo_button.elt.innerText = 'Erase';
    strokeColor = 100;
  }
}

function createFile() {

  let writer = createWriter(nameNoSpaces + '_PressureValues.csv');

    writer.write(["Time (hours) ","Time (mins)", "Time (secs)", "Time (msecs)", "Elapsed Time (ms)","Pressure"+"\n"]);
    var tot_ms = 0;
    var flag = 1;
    for (let i = 0; i < arr.length; i++)
    {
      var d = timearr[i];
      var d_ms = d.getTime();
      var ms = d.getMilliseconds();

      if (i>0)
      {
        var d_bef = timearr[i-1];
        var d_ms_bef = d_bef.getTime();
        var ms_bef = d_bef.getMilliseconds();

        if (ms_bef>ms)
        {
          var flag = 0;
        }
      }


      if(i>0 && flag != 0)
      {
        var d_bef = timearr[i-1];
        var d_ms_bef = d_bef.getTime();
        var ms_bef = d_bef.getMilliseconds();
        var diff = ms - ms_bef;
        tot_ms = tot_ms + diff;

        //var ms_t = mstimearr[i];
        //var ms_t_before = mstimearr[i-1];
        //tot_ms = ms_t-ms_t_before;
      }

      if(i>0 && flag == 0)
      {

        var diff = 1000-ms_bef+ms;
        tot_ms = tot_ms + diff;
        flag = 1;

      }

      writer.write([d.getHours(),d.getMinutes(),d.getSeconds(),d.getMilliseconds(), tot_ms, arr[i] + "\n"]);
      //writer.write([Date() + "\t", arr[i] + "\n"]);
      //writer.write([,"\n"]);
      //writer.write([i+1, arr[i] + "\n"]);

    }

  writer.close();
}


/*function mouseMoved() {
  fill('red');//make white
  noStroke();
  circle(mouseX, mouseY, 50);
}*/
/***********************
*       UTILITIES      *
************************/

// Initializing Pressure.js
// https://pressurejs.com/documentation.html
function initPressure() {

  	//console.log("Attempting to initialize Pressure.js ");

    Pressure.set('#uiCanvas', {

      start: function(event){
        // this is called on force start
        isDrawing = true;
        isDrawingJustStarted = true;
  		},
      end: function(){
    		// this is called on force end
        isDrawing = false
        pressure = 0;
  		},
      change: function(force, event) {
        if (isPressureInit == false){
          console.log("Pressure.js initialized successfully");
	        isPressureInit = true;
      	}
        //console.log(force);
        pressure = force;

      }
    });

    Pressure.config({
      polyfill: true, // use time-based fallback ?
      polyfillSpeedUp: 1000, // how long does the fallback take to reach full pressure
      polyfillSpeedDown: 300,
      preventSelect: true,
      only: null
 		 });

}

// Disabling scrolling and bouncing on iOS Safari
// https://stackoverflow.com/questions/7768269/ipad-safari-disable-scrolling-and-bounce-effect

function preventDefault(e){
    e.preventDefault();
}

function disableScroll(){
    document.body.addEventListener('touchmove', preventDefault, { passive: false });
}
/*
function enableScroll(){
    document.body.removeEventListener('touchmove', preventDefault, { passive: false });
}*/
