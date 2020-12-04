var c;
var ctx;
var axisposx;
var axisborder;
var axisdivisions = 10;
var maxvalue;
var minvalue;
var max;
var min;
var queuesize = 40;

function Queue() {
   this.elements = [];
}

Queue.prototype.enqueue = function (e) {
   this.elements.push(e);
};

Queue.prototype.dequeue = function () {
    return this.elements.shift();
};

Queue.prototype.isEmpty = function () {
    return this.elements.length == 0;
};

Queue.prototype.peek = function () {
    return !this.isEmpty() ? this.elements[0] : undefined;
};

Queue.prototype.getElement = function (n) {
    return !this.isEmpty() ? this.elements[n] : undefined;
};

Queue.prototype.length = function() {
    return this.elements.length;
}

var graphdata = new Queue();


function prepareBackground()
{
	
	ctx.fillStyle = "#292929FF";
	ctx.fillRect(0, 0, c.width, c.height); //paint background in gray
	
	var posx = Math.round(c.width * 0.8);
	var border = Math.round(c.height * 0.1 / 2);
	
	ctx.strokeStyle = "white";
	ctx.beginPath();
	
	ctx.moveTo( posx, border);
	ctx.lineTo( posx, c.height - border);
	ctx.stroke();
}

function initCanvas()
{
	c = document.getElementById("kline");
	ctx = c.getContext("2d");
	ctx.translate(0.5, 0.5); // fix lines that are semi transparent
	
	prepareBackground();
	
	var posx = Math.round(c.width * 0.8);
	var border = Math.round(c.height * 0.1 / 2);
	
	axisposx = posx;
	axisborder = border;
}

function recalcScale(data)
{
	var scale = 1;
	var range = Math.abs(parseFloat(max) - parseFloat(min)) * scale; //max variation multiplied by a size in the total chart (to make it look good);
	range = Math.floor(range); // integer values
	range = range / 2;
	
	minvalue = Math.floor(parseFloat(min) - range); //put the kline in middle of range
	maxvalue = Math.floor(parseFloat(max) + range); //out the kline in middle of range
}

function translateValue(v)
{
	var range = Math.abs(maxvalue - minvalue);
	var tvar = (v - minvalue)/range;
	tvar = 1 - tvar;
	
	var axisvalue = (c.height - axisborder*2) * tvar;
	axisvalue = axisvalue + axisborder;
	
	return axisvalue;
}

function drawAxis(data)
{	
	ctx.font = "12px Arial";
	
	ctx.fillStyle = "white";
	
	var texty = axisborder + 6;//6 is half the font size
	var valtext = maxvalue;
	
	for (var n = 0; n < axisdivisions + 1; n++)
	{
		ctx.fillText(" - " + valtext, axisposx, texty);
		texty = texty + (c.height - 2*axisborder)/axisdivisions;
		
		valtext = valtext - Math.floor(Math.abs(maxvalue - minvalue)/axisdivisions);
	}
}

function drawKnode()
{
	var delta = (c.width * 0.75 - c.width * 0.05)/queuesize;
	
	var i = queuesize - 1;
	for (var n = c.width * 0.75; n > c.width * 0.05;n-= delta)
	{
		var data = graphdata.getElement(i);
		
		if (data != undefined)
		{			
			if (parseFloat(data[1]) > parseFloat(data[4]))
			{	
				ctx.strokeStyle = "green";
			}
			else{
				ctx.strokeStyle = "red";
			}
			
			ctx.beginPath();
			
			ctx.moveTo( n + delta/2, translateValue(data[3]));
			ctx.lineTo( n + delta/2, translateValue(data[2]));
			
			ctx.stroke();
			ctx.closePath();
			
			ctx.fillStyle = ctx.strokeStyle;
					
			if (parseFloat(data[1]) < parseFloat(data[4])){
				ctx.fillRect(n + delta/2 - delta/4, translateValue(data[4]), delta/2, Math.abs(translateValue(data[4]) - translateValue(data[1])));
			}
			else
			{
				ctx.fillRect(n + delta/2 - delta/4, translateValue(data[1]), delta/2, Math.abs(translateValue(data[1]) - translateValue(data[4])));
			}
		}
		
		i--;
	}
}

function pushNewData(data)
{
	var needrefresh = false;
	
	ctx.clearRect(0, 0, c.width, c.height);
	
	prepareBackground();
	
	graphdata.enqueue(data);
	graphdata.dequeue();
	
	if (max < parseFloat(data[2])){
		max = parseFloat(data[2]);
		needrefresh = true;
	}
		
	if (min > parseFloat(data[3]))
	{
		min = parseFloat(data[3]);
		needrefresh = true;
	}
	
	if (needrefresh)
	{
		recalcScale();
	}
	
	drawAxis(data);
	
	drawKnode();
}

function drawKlines(data)
{
	if (data.length == 0)
	{
		return;
	}
	
	for (var i = 0; i < queuesize; i++)
	{
		graphdata.enqueue(data[i]);
		
		if (max == undefined || max < data[i][2]){
			max = parseFloat(data[i][2]);
		}
		
		if (min == undefined || min > data[i][3])
		{
			min = parseFloat(data[i][3]);
		}
	}
	
	recalcScale();
	drawAxis(data[0]);
	
	drawKnode();
}


(async function () {
  initCanvas();
  const seriesData = await fetchSeriesData()
    console.log('seriesData: ', seriesData)
    subcribe(data => { // data: [time, open, high, low, close]
      console.log('subscribe: ', data);
	  
	  pushNewData(data);
    })

  drawKlines(seriesData);
  
  // [time, open, high, low, close][]
  function fetchSeriesData() {
    return new Promise((resolve, reject) => {
      fetch('https://www.binance.com/api/v1/klines?symbol=BTCUSDT&interval=1m')
        .then(async res => {
          const data = await res.json()
          const result = data.map(([time, open, high, low, close]) => [time, open, high, low, close])
          resolve(result)
        })
        .catch(e => reject(e))
    })
  }
  function subcribe(success) {
    try {
      const socket = new WebSocket('wss://stream.binance.com/stream?streams=btcusdt@kline_1m')
      socket.onmessage = e => {
        const res = JSON.parse(e.data)
        const { t, o, h, l, c } = res.data.k
        success([t, o, h, l, c]);
      }
    } catch(e) {
      console.error(e.message)
    }
  }
})()