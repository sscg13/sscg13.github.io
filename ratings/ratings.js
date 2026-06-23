async function loadData() {
    const response = await fetch("data.json");
    return await response.json();
}

function signed(n, decimals) {
    const v = n.toFixed(decimals);
    return n > 0 ? "+" + v : v;
}

function diffClass(n) {
    return n > 0 ? "pos" : (n < 0 ? "neg" : "");
}

function engineLink(name, found) {
    const a = document.createElement("a");
    a.textContent = name;
    if (found) {
        a.href = "engine.html?engine=" + encodeURIComponent(name);
    } else {
        a.removeAttribute("href");
        a.style.color = "inherit";
        a.style.cursor = "default";
    }
    return a;
}

async function initMain() {
    const data = await loadData();
    const names = new Set(data.engines.map(e => e.name));
    const tbody = document.getElementById("ratings-body");
    for (const e of data.engines) {
        const tr = document.createElement("tr");

        const rank = document.createElement("td");
        rank.textContent = e.rank;
        tr.appendChild(rank);

        const name = document.createElement("td");
        name.className = "name";
        name.appendChild(engineLink(e.name, names.has(e.name)));
        tr.appendChild(name);

        const rating = document.createElement("td");
        rating.textContent = e.rating.toFixed(1);
        tr.appendChild(rating);

        const error = document.createElement("td");
        error.textContent = e.error === null ? "----" : "±" + e.error.toFixed(1);
        tr.appendChild(error);

        const points = document.createElement("td");
        points.textContent = e.points.toFixed(1);
        tr.appendChild(points);

        const played = document.createElement("td");
        played.textContent = e.played;
        tr.appendChild(played);

        const pct = document.createElement("td");
        pct.textContent = `${e.pct}% (${e.points.toFixed(1)} / ${e.played})`;
        tr.appendChild(pct);

        tbody.appendChild(tr);
    }

    if (data.draw_rate) {
        document.getElementById("summary").textContent =
            `Draw rate (equal opponents) = ${data.draw_rate.value.toFixed(2)}% ± ${data.draw_rate.error.toFixed(2)}%`;
    }
}

function paramEngine() {
    return new URLSearchParams(window.location.search).get("engine");
}

async function initEngine() {
    const data = await loadData();
    const names = new Set(data.engines.map(e => e.name));
    const requested = paramEngine();
    const engine = data.engines.find(e => e.name === requested);

    if (!engine) {
        document.getElementById("engine-title").textContent = "Engine not found";
        return;
    }

    document.title = engine.name + " - Ratings";
    document.getElementById("engine-title").textContent =
        `#${engine.rank} ${engine.name}`;

    const r = engine.record;
    document.getElementById("engine-summary").textContent =
        `Rating: ${engine.rating.toFixed(1)} (${engine.error === null ? "----" : "±" + engine.error.toFixed(1)})  |  ` +
        `Record: +${r.wins} =${r.draws} -${r.losses} (${engine.played} games)  |  Score: ${engine.pct}% (${engine.points.toFixed(1)} / ${engine.played})`;

    const tbody = document.getElementById("opponents-body");
    const opponents = [...engine.opponents].sort((a, b) => b.diff - a.diff);
    for (const o of opponents) {
        const tr = document.createElement("tr");

        const name = document.createElement("td");
        name.className = "name";
        name.appendChild(engineLink(o.name, names.has(o.name)));
        tr.appendChild(name);

        const games = document.createElement("td");
        games.textContent = o.games;
        tr.appendChild(games);

        const wdl = document.createElement("td");
        wdl.textContent = `+${o.wins} =${o.draws} -${o.losses}`;
        tr.appendChild(wdl);

        const pct = document.createElement("td");
        const opponentPoints = o.wins + 0.5 * o.draws;
        pct.textContent = `${o.pct.toFixed(1)}% (${opponentPoints.toFixed(1)} / ${o.games})`;
        tr.appendChild(pct);

        const diff = document.createElement("td");
        diff.textContent = signed(o.diff, 1);
        diff.className = diffClass(o.diff);
        tr.appendChild(diff);

        const sd = document.createElement("td");
        sd.textContent = o.sd.toFixed(1);
        tr.appendChild(sd);

        const cfs = document.createElement("td");
        cfs.textContent = o.cfs.toFixed(1) + "%";
        tr.appendChild(cfs);

        tbody.appendChild(tr);
    }
}
