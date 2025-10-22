const experiment = {
  times: [], // 保留原有结构用于兼容性
  leftTimes: [], // 左圆圈反应时间
  rightTimes: [], // 右圆圈反应时间
  sides: [], // 记录每次试验的圆圈类型 ('left' 或 'right')
  maxTrials: 20, // 总试验次数改为20次
  maxTrialsPerSide: 10, // 每个圆圈最多10次
  leftCount: 0, // 左圆圈已亮次数
  rightCount: 0, // 右圆圈已亮次数
  waitHnd: -1,
  started: false,
  ended: false,
  stimulusWait: false,
  stimulusShown: false,
  stimulusShownAt: -1,
  btnDisabled:false,
  currentSide: null // 当前亮起的是哪一边 ('left' 或 'right')
};

const btn = document.querySelector(".button-default");
const leftCircle = document.querySelector(".left-circle");
const rightCircle = document.querySelector(".right-circle");
let activeCircle = null; // 当前激活的圆圈

const advanceTrial = function () {
  //reset stimulus
  updateStimulus("inactive");

  if (experiment.leftCount + experiment.rightCount < experiment.maxTrials) {
    //still need to run more trials
    experiment.stimulusShown = false; //reset
    scheduleStimulus();
  } else {
    //experiment ended
    experiment.stimulusShown = false;
    endExperiment();
  }
};

const endExperiment = function () {
  console.info("INFO: Experiment ended. Await download of results");

  experiment.ended = true;

  //Update Button Styling
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
    // 实现不放回抽取逻辑
    let isLeft;
    const totalTrials = experiment.leftCount + experiment.rightCount;
    const remainingTrials = experiment.maxTrials - totalTrials;
    
    if (experiment.leftCount >= experiment.maxTrialsPerSide) {
      // 左边已经达到最大次数，只能选右边
      isLeft = false;
    } else if (experiment.rightCount >= experiment.maxTrialsPerSide) {
      // 右边已经达到最大次数，只能选左边
      isLeft = true;
    } else {
      // 两边都还有剩余次数，按概率选择
      const leftRemaining = experiment.maxTrialsPerSide - experiment.leftCount;
      const leftProbability = leftRemaining / remainingTrials;
      isLeft = Math.random() < leftProbability;
    }
    
    // 更新计数器和当前边
    if (isLeft) {
      experiment.leftCount++;
      experiment.currentSide = 'left';
    } else {
      experiment.rightCount++;
      experiment.currentSide = 'right';
    }
    
    activeCircle = isLeft ? leftCircle : rightCircle;
    const inactiveCircle = isLeft ? rightCircle : leftCircle;
    
    // 激活选中的圆圈，确保另一个圆圈是非激活状态
    activeCircle.classList.add(state);
    activeCircle.classList.remove(otherState);
    inactiveCircle.classList.add(otherState);
    inactiveCircle.classList.remove(state);
  } else {
    // 重置状态，两个圆圈都设为非激活状态
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
  experiment.times.push(deltaTime); // 保留原有结构用于兼容性
  experiment.sides.push(experiment.currentSide); // 记录圆圈类型
  
  // 根据当前激活的圆圈分别记录反应时间
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
  } //prior to start of experiment, ignore
  if (experiment.stimulusWait) {
    return;
  } //ignore false trigger reactions

  if (experiment.stimulusShown) {
    //stimulus is visible, capture
    logReaction();
    advanceTrial();
  }
};

const startExperiment = function () {
  console.info("INFO: Experiment Started");
  // 重置两个圆圈的样式
  leftCircle.style.backgroundColor = '';
  rightCircle.style.backgroundColor = '';
  document.querySelector("#instructions").style.display = "none";
  experiment.started = true;
  window.addEventListener("keypress", onKey); //add keylistener
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
  //to get mean, get sum of all trials and divide by number of trials m = sum(x)/cnt(x)
  const sums = timeArr.reduce((acc, num) => acc + num, 0);
  const meanDeltaTime = sums / timeArr.length;

  //standard deviation is  sqrt(sum(x-mean)^2/cnt(x))
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
    .join("\n"); //map passes every record in the log array to the getCSVDataLine, we also need to include pid to all rows
  exportData(csvHeader + csvData, "VisualReactionTestResults.csv");
};

const exportData = function (csvDataString, exportFileName) {
  // Create a Blob with the CSV data
  const blob = new Blob([csvDataString], { type: "text/csv" });

  // Create a temporary link element
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = exportFileName;

  // Trigger the download
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();

  // Clean up
  window.URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
};

const onKey = function (evt) {
  if (evt == null) {
    evt = window.event;
  }
  switch (evt.which || evt.charCode || evt.keyCode) {
    case 32: //space
      userReaction();
      break;
    default:
      console.warn("WARN: Key:", evt, evt.which, evt.charCode, evt.keyCode);
  }
};

btn.addEventListener("click", btnAction);
