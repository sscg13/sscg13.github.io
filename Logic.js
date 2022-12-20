var initialorder = [];
var repeatingorder = [1, -1];
var board = [];
var board1 = [];
var positive = [];
var positive1 = [];
var pmoves = [];
var pprior;
var pprior1;
var pmoves1 = [];
var negative = [];
var negative1 = [];
var nmoves = [];
var nmoves1 = [];
var nprior;
var nprior1;
var result = "";
for (var i = 0; i < 36; i++) {
    board.push(0);
    positive.push(0);
    negative.push(0);
}
var highest = 0;
var highest1 = 0;
var lowest = 0;
var lowest1 = 0;
var filled = 36;
var filled1 = 36;
var gamenotation = [0, 28];
var numtostr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"];
var neighbors = [[1, 6, 7], [0, 2, 6, 7, 8], [1, 3, 7, 8, 9], [2, 4, 8, 9, 10], [3, 5, 9, 10, 11], [4, 10, 11],
[0, 1, 7, 12, 13], [0, 1, 2, 6, 8, 12, 13, 14], [1, 2, 3, 7, 9, 13, 14, 15], [2, 3, 4, 8, 10, 14, 15, 16],
[3, 4, 5, 9, 11, 15, 16, 17], [4, 5, 10, 16, 17], [6, 7, 13, 18, 19], [6, 7, 8, 12, 14, 18, 19, 20],
[7, 8, 9, 13, 15, 19, 20, 21], [8, 9, 10, 14, 16, 20, 21, 22], [9, 10, 11, 15, 17, 21, 22, 23], [10, 11, 16, 22, 23],
[12, 13, 19, 24, 25], [12, 13, 14, 18, 20, 24, 25, 26], [13, 14, 15, 19, 21, 25, 26, 27], [14, 15, 16, 20, 22, 26, 27, 28],
[15, 16, 17, 21, 23, 27, 28, 29], [16, 17, 22, 28, 29], [18, 19, 25, 30, 31], [18, 19, 20, 24, 26, 30, 31, 32],
[19, 20, 21, 25, 27, 31, 32, 33], [20, 21, 22, 26, 28, 32, 33, 34], [21, 22, 23, 27, 29, 33, 34, 35], [22, 23, 28, 34, 35],
[24, 25, 31], [24, 25, 26, 30, 32], [25, 26, 27, 31, 33], [26, 27, 28, 32, 34], [27, 28, 29, 33, 35], [28, 29, 34]];
//MCTS constants
var global = [0, 0, 0];
var score = 0;
var score1 = 0;
var selectivity = 2;
var nodearray = [[]];
var QN = [];
//More stuff
var twoaways = [];
var neighbors1;
var secneighbors;
for (var q = 0; q < neighbors.length; q++) {
    secneighbors = [];
    neighbors1 = neighbors[q];
    for (var w = 0; w < neighbors1.length; w++) {
        var neighbors2 = neighbors[neighbors1[w]];
        for (var e = 0; e < neighbors2.length; e++) {
            if (secneighbors.indexOf(neighbors2[e]) < 0) {
                secneighbors.push(neighbors2[e])
            }
        }
    }
    twoaways.push(secneighbors)
}
function updateUI(i) {
    if (board[i] == 0) {
        document.getElementById(numtostr[i]).style.color = "white";
    }
    else if (board[i] > 0) {
        document.getElementById(numtostr[i]).style.color = "blue";
    }
    else {
        document.getElementById(numtostr[i]).style.color = "red";
    }
    document.getElementById(numtostr[i]).innerHTML = Math.abs(board[i]);
    document.getElementById("Score").innerHTML = "Blue " + highest + " to Red " + Math.abs(lowest);
    if (filled == 0) {
        determinewin();
        document.getElementById("Result").innerHTML = result;
    }
    if (player1(gamenotation.length) == 1) {
        document.getElementById("Move").innerHTML = "Blue to move.";
    }
    else {
        document.getElementById("Move").innerHTML = "Red to move.";
    }
}
function player1(i) {
    if (i < initialorder.length) {
        return initialorder[i];
    }
    else {
        return repeatingorder[(i-initialorder.length)%(repeatingorder.length)];
    }
}
function updateboard(pos, player) {
    if (pos < 0) {
        return;
    }
    var p = pmoves.indexOf(pos);
    var n = nmoves.indexOf(pos);
    if (p >= 0) {
        pmoves = pmoves.filter(function equal(value) {return value != pos});
    }
    if (n >= 0) {
        nmoves = nmoves.filter(function equal(value) {return value != pos});
    }
    var max = 0;
    for (var i = 0; i < neighbors[pos].length; i++) {
        if (player == 1) {
            if (positive[neighbors[pos][i]] == 0 && board[neighbors[pos][i]] == 0) {
                pmoves.push(neighbors[pos][i]);
            }
            positive[neighbors[pos][i]]++;
        }
        else {
            if (negative[neighbors[pos][i]] == 0 && board[neighbors[pos][i]] == 0) {
                nmoves.push(neighbors[pos][i]);
            }
            negative[neighbors[pos][i]]++;
        }
        if (board[neighbors[pos][i]]*player > max) {
            max = board[neighbors[pos][i]]*player;
        }
    }
    if (max == highest*player) {
        highest++;
        pprior = pos;
    }
    if (max == lowest*player) {
        lowest--;
        nprior = pos;
    }
    board[pos] = (max+1)*player;
    filled--;
}
function readUI(pos) {
    let valid = true;
    for (var i = 0; i < gamenotation.length; i++) {
        if (gamenotation[i] == pos && pos >= 0) {
            valid = false;
        }
    }
    if (player1(gamenotation.length) == 1 && positive[pos] == 0) {
        valid = false;
    }
    if (player1(gamenotation.length) == -1 && negative[pos] == 0) {
        valid = false;
    }
    if (valid) {
        updateboard(pos, player1(gamenotation.length));
        gamenotation.push(pos);
        updateUI(pos);
    }
}
for (var i = 0; i < gamenotation.length; i++) {
    updateboard(gamenotation[i], player1(i));
}
for (var i = 0; i < 36; i++) {
    updateUI(i);
}
function determinewin() {
    var sum = highest+lowest;
    if (sum > 0) {
        global[0]++;
        score = 0.5;
        result = "Blue wins."
    }
    if (sum == 0) {
        global[1]++;
        score = 0;
        result = "Tie."
    }
    if (sum < 0) {
        global[2]++;
        score = -0.5;
        result = "Red wins."
    }
}

function copy() {
    for (var i = 0; i < 36; i++) {
        board[i] = 0;
        positive[i] = 0;
        negative[i] = 0;
    }
    pmoves = [-1];
    nmoves = [-1];
    score = 0;
    highest = 0;
    lowest = 0;
    filled = 36;
    board1 = [];
    pmoves1 = [];
    positive1 = [];
    nmoves1 = [];
    negative1 = [];
    for (var i = 0; i < gamenotation.length; i++) {
        updateboard(gamenotation[i], player1(i));
    }
    for (var i = 0; i < board.length; i++) {
        board1.push(board[i]);
    }
    for (var i = 0; i < pmoves.length; i++) {
        pmoves1.push(pmoves[i]);
    }
    for (var i = 0; i < positive.length; i++) {
        positive1.push(positive[i]);
    }
    for (var i = 0; i < nmoves.length; i++) {
        nmoves1.push(nmoves[i]);
    }
    for (var i = 0; i < negative.length; i++) {
        negative1.push(negative[i]);
    }
    highest1 = highest;
    lowest1 = lowest;
    filled1 = filled;
    pprior1 = pprior;
    nprior1 = nprior;
}
function reset() {
    pmoves = [];
    nmoves = [];
    score = 0;
    highest = highest1;
    lowest = lowest1;
    filled = filled1;
    pprior = pprior1;
    nprior = nprior1;
    for (var i = 0; i < 36; i++) {
        board[i] = board1[i];
        positive[i] = positive1[i];
        negative[i] = negative1[i];
    }
    for (var i = 0; i < pmoves1.length; i++) {
        pmoves.push(pmoves1[i]);
    }
    for (var i = 0; i < nmoves1.length; i++) {
        nmoves.push(nmoves1[i]);
    }
}
function getrandommove(player) {
    if (player == 1) {
        if (pmoves.length == 0) {
            return -1;
        }
        for (var i = 0; i < neighbors[pprior].length; i++) {
            if (board[neighbors[pprior][i]] == 0) {
                return neighbors[pprior][i];
            }
        }
        return pmoves[Math.floor(Math.random()*pmoves.length)];
    }
    else {
        if (nmoves.length == 0) {
            return -1;
        }
        for (var i = 0; i < neighbors[nprior].length; i++) {
            if (board[neighbors[nprior][i]] == 0) {
                return neighbors[nprior][i];
            }
        }
        return nmoves[Math.floor(Math.random()*nmoves.length)];
    }
}
//~1 million positions/sec translates to 25000 playouts/sec on my computer
function getrandomgame(ply) {
    var i = ply;
    var next;
    while (filled > 0) {
        next = getrandommove(player1(i));
        updateboard(next, player1(i));
        i++;
    }
    determinewin();
}
function neighbor(pos) {
    var pcount = 0;
    var ncount = 0;
    for (var i = 0; i < twoaways[pos].length; i++) {
        if (board[twoaways[pos][i]] > 0) {
            pcount++;
        }
        else if (board[twoaways[pos][i]] < 0) {
            ncount++;
        }
    }
    if (pcount == 0 && ncount == 0) {
        return 0;
    }
    return (pcount-ncount)/(pcount+ncount);
}
function heuristic1() {
    if (filled == 0) {
        return 0.5*Math.sign(highest+lowest);
    }
    var bonus = 0;
    var array2 = [];
    for (var o = 0; o < 36; o++) {
        if (board[o] == 0) {
            array2.push(o)
        }
    }
    for (var j = 0; j < array2.length; j++) {
        bonus = bonus + neighbor(array2[j])
    }
    var total = highest+lowest+bonus;
    return Math.atan(total)/Math.PI;
}
function updatenodearray(node) {
    var len = nodearray.length;
    var ply = nodearray[node][1];
    var player = player1(ply+gamenotation.length)
    var upcount;
    if (player == 1) {
        upcount = pmoves.length;
    }
    else {
        upcount = nmoves.length;
    }
    for (var i = 0; i < upcount; i++) {
        QN.push([0.5, 1])
        nodearray[node].push(len+i)
        nodearray.push([node, ply+1])
    }
}
function parent(node, n) {
    var parent;
    parent = nodearray[node][0];
    for (var i = 1; i < n; i++) {
        parent = nodearray[parent][0];
    }
    return parent;
}
function value(node) {
    return Math.random()/40+QN[node][0]/QN[node][1]+selectivity*Math.sqrt(Math.log(QN[parent(node)][1])/QN[node][1]);
}
function update(node) {
    var player = player1(nodearray[node][1]+gamenotation.length-1);
    QN[node][0]+=0.5;
    QN[node][0]+=player*score*0.3+player*score1*0.7;
    QN[node][1]++;
}
function backpropagation(node) {
    var ply = nodearray[node][1];
    update(node);
    for (var i = 0; i < ply; i++) {
        update(parent(node, i+1))
    }
}
function bestchild(node) {
    var bestchild1;
    var value1 = 0;
    for (var i = 2; i < nodearray[node].length; i++) {
        var ES = value(nodearray[node][i]);
        if (ES > value1) {
            value1 = ES;
            bestchild1 = i;
        }
    }
    return bestchild1 - 2;
}
function explored(node) {
    var children = nodearray[node].length;
    if (children == 2) {
        return 0;
    }
    return 1;
}
function bestscore(node) {
    var bestchild;
    var score = 0;
    var testscore;
    for (var i = 2; i < nodearray[node].length; i++) {
        testscore = QN[nodearray[node][i]][0]/QN[nodearray[node][i]][1];
        if (testscore > score) {
            score = testscore
            bestchild = i;
        }
    }
    return bestchild - 2;
}
function mcts(strength) {
    copy();
    nodearray = [];
    nodearray.push([0, 0]);
    QN = [];
    QN.push([0.5, 1])
    for (var i = 0; i < strength; i++) {
        reset();
        var node = 0;
        while (explored(node) == 1) {
            var player = player1(nodearray[node][1]+gamenotation.length);
            var chosenone = bestchild(node);
            if (player == 1) {
                updateboard(pmoves[chosenone], 1);
            }
            else {
                updateboard(nmoves[chosenone], -1);
            }
            node = nodearray[node][chosenone+2];
        }
        updatenodearray(node);
        score1 = heuristic1();
        getrandomgame(nodearray[node][1]+gamenotation.length)
        backpropagation(node);
    }
    copy();
    console.log("First player chances: " + (global[0]+global[1]*0.5)/(global[0]+global[1]+global[2]));
    /*var best = 0;
    var node = 0;
    var plus = 0;
    var pv = "PV is";
    var player;
    while (explored(node)==1) {
        player = player1(gamenotation.length+plus);
        best = bestscore(node);
        if (player == 1) {
            pv = pv + " " + pmoves[best];
            updateboard(pmoves[best], 1);
        }
        else {
            pv = pv + " " + nmoves[best];
            updateboard(nmoves[best], -1);
        }
        node = nodearray[node][best+2];
        plus++;
    }
    console.log(pv)
    reset()*/
    var next;
    if (player1(gamenotation.length) == 1) {
        next = pmoves[bestscore(0)];
    }
    else {
        next = nmoves[bestscore(0)];
    }
    readUI(next);
    updateUI(next);
}