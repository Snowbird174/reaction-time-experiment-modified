const experiment = {
  times: [], 
  leftTimes: [], 
  rightTimes: [], 
  sides: [], 
  maxTrials: 20, 
  maxTrialsPerSide: 10,
  leftCount: 0,
  rightCount: 0,
  waitHnd: -1,
  started: false,
  ended: false,
  stimulusWait: false,
  stimulusShown: false,
  stimulusShownAt: -1,
  btnDisabled:false,
  currentSide: null
};

const btn = document.querySelector(".button-default");
const leftCircle = document.querySelector(".left-circle");
const rightCircle = document.querySelector(".right-circle");
const fixationCross = document.querySelector("#fixation-cross");
let activeCircle = null;

const advanceTrial = function () {
  //reset stimulus
  updateStimulus("inactive");

  if (experiment.leftCount + experiment.rightCount < experiment.maxTrials) {
    experiment.stimulusShown = false;
    scheduleStimulus();
  } else {
    experiment.stimulusShown = false;
    endExperiment();
  }
};

const endExperiment = function () {
  console.info("INFO: Experiment ended. Await download of results");

  experiment.ended = true;

  
  experiment.btnDisabled = false;
  btn.classList.toggle("button-enabled");
  btn.classList.toggle("button-disabled");
  btn.textContent = "Download Data";
};

const scheduleStimulus = function () {
  experiment.stimulusWait = true;
  const randomDelay = Math.floor(Math.random() * 4 + 2); // 2 - 5s
  experiment.waitHnd = window.setTimeout(showStimulus, randomDelay * 1000); //setTimeout runs in milliseconds
  console.info(
    "INFO: Trial",
    experiment.times.length,
    ". Random delay:",
    randomDelay
  );
};

const showStimulus = function () {
  experiment.stimulusShownAt = Date.now();
  console.info(
    "INFO: Trial",
    experiment.times.length,
    ". Stimulus shown",
    experiment.stimulusShownAt
  );
  updateStimulus("active");
  experiment.stimulusWait = false;
  experiment.stimulusShown = true;
};

const updateStimulus = function (state) {
  const otherState = state == "active" ? "inactive" : "active";

  if (state == "active") {
    let isLeft;
    const totalTrials = experiment.leftCount + experiment.rightCount;
    const remainingTrials = experiment.maxTrials - totalTrials;
    
    if (experiment.leftCount >= experiment.maxTrialsPerSide) {
      isLeft = false;
    } else if (experiment.rightCount >= experiment.maxTrialsPerSide) {
      isLeft = true;
    } else {
      const leftRemaining = experiment.maxTrialsPerSide - experiment.leftCount;
      const leftProbability = leftRemaining / remainingTrials;
      isLeft = Math.random() < leftProbability;
    }
    
    if (isLeft) {
      experiment.leftCount++;
      experiment.currentSide = 'left';
    } else {
      experiment.rightCount++;
      experiment.currentSide = 'right';
    }
    
    activeCircle = isLeft ? leftCircle : rightCircle;
    const inactiveCircle = isLeft ? rightCircle : leftCircle;
    
    activeCircle.classList.add(state);
    activeCircle.classList.remove(otherState);
    inactiveCircle.classList.add(otherState);
    inactiveCircle.classList.remove(state);
  } else {
    leftCircle.classList.add(state);
    leftCircle.classList.remove(otherState);
    rightCircle.classList.add(state);
    rightCircle.classList.remove(otherState);
    activeCircle = null;
  }
};

const logReaction = function () {
  let userReactedAt = Date.now();
  console.info("INFO: User reaction captured.", userReactedAt);

  let deltaTime = userReactedAt - experiment.stimulusShownAt;
  experiment.times.push(deltaTime);
  experiment.sides.push(experiment.currentSide);
  
  if (experiment.currentSide === 'left') {
    experiment.leftTimes.push(deltaTime);
  } else if (experiment.currentSide === 'right') {
    experiment.rightTimes.push(deltaTime);
  }
  
  document.querySelector("#time").textContent = deltaTime + " ms";
};

const userReaction = function () {
  if (!experiment.started) {
    return;
  } 
  if (experiment.stimulusWait) {
    return;
  } 

  if (experiment.stimulusShown) {
    logReaction();
    advanceTrial();
  }
};

const startExperiment = function () {
  console.info("INFO: Experiment Started");
  leftCircle.style.backgroundColor = '';
  rightCircle.style.backgroundColor = '';
  document.querySelector("#instructions").style.display = "none";
  fixationCross.classList.add("visible");
  experiment.started = true;
  window.addEventListener("keypress", onKey);
  advanceTrial();
};

const btnAction = function () {
  console.debug("DBG:", "click");
  if(experiment.btnDisabled) return;
  if (!experiment.ended) {
    experiment.btnDisabled = true;
    btn.classList.toggle("button-enabled");
    btn.classList.toggle("button-disabled");
  }
  if (!experiment.started) {
    startExperiment();
  } else {
    if (experiment.ended) {
      exportExperimentLog();
      const leftStats = computeStatistics(experiment.leftTimes);
      const rightStats = computeStatistics(experiment.rightTimes);
      const overallStats = computeStatistics(experiment.times);
      
      document.querySelector("#time").innerHTML = [
         "<strong>Left Circle:</strong> Count: " + leftStats.cnt + ", Mean: " + leftStats.mean.toFixed(2) + " ms, SD: " + leftStats.sd.toFixed(2) + " ms<br>",
         "<strong>Right Circle:</strong> Count: " + rightStats.cnt + ", Mean: " + rightStats.mean.toFixed(2) + " ms, SD: " + rightStats.sd.toFixed(2) + " ms<br>",
         "<strong>Overall:</strong> Count: " + overallStats.cnt + ", Mean: " + overallStats.mean.toFixed(2) + " ms, SD: " + overallStats.sd.toFixed(2) + " ms"
       ].join("");
    } else {
      console.log("DBG: Should this occur?");
    }
  }
};

const computeStatistics = function (timeArr) {
  const sums = timeArr.reduce((acc, num) => acc + num, 0);
  const meanDeltaTime = sums / timeArr.length;

  const squaredDiffs = timeArr.reduce(
    (acc, num) => (num - meanDeltaTime) ** 2 + acc,
    0
  );
  const standardDeviationTime = Math.sqrt(squaredDiffs / timeArr.length);

  return {
    sd: standardDeviationTime,
    mean: meanDeltaTime,
    cnt: timeArr.length,
  };
};

const exportExperimentLog = function () {
  let csvHeader = "pid,trial#,reactionTime (ms),circle\n";
  let pid = Math.floor(Math.random() * 900000) + 100000;
  let csvData = experiment.times
    .map((time, idx) => [pid, idx, time, experiment.sides[idx]].join(","))
    .join("\n"); 
  exportData(csvHeader + csvData, "VisualReactionTestResults.csv");
};

const exportData = function (csvDataString, exportFileName) {
  const blob = new Blob([csvDataString], { type: "text/csv" });
  
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = exportFileName;

  document.body.appendChild(a);
  a.style.display = "none";
  a.click();

  window.URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
};

const onKey = function (evt) {
  if (evt == null) {
    evt = window.event;
  }
  switch (evt.which || evt.charCode || evt.keyCode) {
    case 32: 
      userReaction();
      break;
    default:
      console.warn("WARN: Key:", evt, evt.which, evt.charCode, evt.keyCode);
  }
};

btn.addEventListener("click", btnAction);

leftCircle.classList.add("inactive");
rightCircle.classList.add("inactive");
