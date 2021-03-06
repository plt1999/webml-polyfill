require('../lib/jsonOperation.js');
const fs = require('fs');
const path = require('path');
let case_path = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);

function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}
mkdirsSync(case_path);

let regexmodel = /resnet/;
global.matchFlatmodel = regexmodel.test(`${JSON_DATA.getModelName()}`);
if (matchFlatmodel) {
  global.arr = [];
  for (i = 0; i < 7; i++) {
    let filePath = path.join(__dirname, '..', 'model', JSON_DATA.getModelName(), `${JSON_DATA.getModelName()}-${i}.json`);
    if (!fs.existsSync(filePath)) throw (`Can't get ${filePath}`);
    let contentText = fs.readFileSync(filePath,'utf-8');
    arr[i] = JSON.parse(contentText);
  }
  generateCase(arr[0]);
} else {
  let filePath = path.join(__dirname, '..', 'model', JSON_DATA.getModelName(), `${JSON_DATA.getModelName()}.json`);
  if (!fs.existsSync(filePath)) throw (`Can't get ${filePath}`);
  let contentText = fs.readFileSync(filePath,'utf-8');
  global.buf = JSON.parse(contentText);
  generateCase(buf);
}

async function saveToLocalFile(input) {
  let output = input.toString();
  let dataString;
  if (matchFlatmodel) {
    input = parseInt(input);
    let b = true;
    if (arr[0].operation[input]) {
      dataString = arr[0].operation[input];
      b = false;
    } 
    if (b) {
      for (i = 1; i < 7; i++) {
        if (arr[i].operands[input]) {
          dataString = arr[i].operands[input]
          break;
        }
      }
    }
    if (dataString === undefined) {
      throw ('please check input data');
    }
  } else {
    if (buf.operation.hasOwnProperty(input)) {
      dataString = buf.operation[input];
    } else if (buf.operands.hasOwnProperty(input)) {
      dataString = buf.operands[input];
    } else {
      throw ('please check input data');
    }
  }

  let dataArray = [];
  for (let key in dataString) {
    dataArray.push(dataString[key]);
  }
  let saveFileDirs = path.join(__dirname, '..', 'testcase', 'res', `${JSON_DATA.getModelName()}`);
  mkdirsSync(saveFileDirs);
  let saveStream = fs.createWriteStream(path.join(saveFileDirs, output), {flags: 'w', encoding: 'utf-8'});
  saveStream.on('error', (err) => {
    console.error(err);
  });
  if (typeof (dataArray) === 'object') {
    saveStream.write(JSON.stringify(dataArray));
  } else {
    saveStream.write(dataArray);
  }
  saveStream.end();
}

async function saveCaseToLocal(input, output) {
  let saveFileDirs = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
  let saveStream = fs.createWriteStream(path.join(saveFileDirs, output), {flags: 'w', encoding: 'utf-8'});
  saveStream.on('error', (err) => {
    console.error(err);
  });
  if (typeof (input) === 'object') {
    saveStream.write(JSON.stringify(input));
  } else {
    saveStream.write(input);
  }
  saveStream.end();
}

async function gettensorTypes(ids) {
  if (matchFlatmodel) {
    if (arr[0].tensorTypes.hasOwnProperty(ids)) {
        if (Array.isArray(arr[0].tensorTypes[ids].dimensions) == false) {
          let arr_model = Object.keys(arr[0].tensorTypes[ids].dimensions);
          let array = [];
          for (i = 0; i < arr_model.length; i++) {
            array.push(arr[0].tensorTypes[ids].dimensions[i]);
          }
          return array;
        } else {
          return arr[0].tensorTypes[ids].dimensions;
        }
    }
  } else {
    if (buf.tensorTypes.hasOwnProperty(ids)) {
      return buf.tensorTypes[ids].dimensions
    }
  }
}

async function getOperands(ids) {
  if (matchFlatmodel) {
    ids = parseInt(ids);
    for (i = 1; i < 7; i++) {
      if (arr[i].operands[ids]){
        return arr[i].operands[ids];
      }
    }
  } else {
    if (buf.operands.hasOwnProperty(ids)) {
      return buf.operands[ids];
    }
  }
}

let result = [];
async function splitContext(context) {
  let inputFile = context[1][0];
  let inputDims = (await gettensorTypes(inputFile));
  let outputFile = context[2][0];
  let outputDims = (await gettensorTypes(outputFile));
  await saveToLocalFile(inputFile);
  await saveToLocalFile(outputFile);
  switch(context[0]) {
  case 0: {
    let inputFile1 = context[1][1];
    let inputDims1 = (await gettensorTypes(inputFile1));
    await saveToLocalFile(inputFile1);
    let activation = (await getOperands(context[1][2]))[0];
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /add-/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
    const assert = chai.assert;
    const nn = navigator.ml.getNeuralNetworkContext();
    it('Check result for layer-${layer} ADD example/${count} of ${JSON_DATA.getModelName()} model', async function() {
      let model = await nn.createModel(options);
      let operandIndex = 0;
      let op1_value;
      let op2_value;
      let op3_expect;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op1_value = file_data;
      });
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op3_expect = file_data;
      });
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile1}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op2_value = file_data;
      });
      let type1 = {type: nn.INT32};
      let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims1}]};
      let type0_length = product(type0.dimensions);
      let op1 = operandIndex++;
      model.addOperand(type0);
      let op2 = operandIndex++;
      model.addOperand(type0);
      let act = operandIndex++;
      model.addOperand(type1);
      let op3 = operandIndex++;
      model.addOperand(type0);
      let op2_input = new Float32Array(op2_value);
      model.setOperandValue(op2, op2_input);
      model.setOperandValue(act, new Int32Array([${activation}]));
      model.addOperation(nn.ADD, [op1, op2, act], [op3]);
      model.identifyInputsAndOutputs([op1], [op3]);
      await model.finish();
      let compilation = await model.createCompilation();
      compilation.setPreference(getPreferenceCode(options.prefer));
      await compilation.finish();
      let execution = await compilation.createExecution();
      let op1_input = new Float32Array(op1_value);
      execution.setInput(0, op1_input);
      let op3_output = new Float32Array(type0_length);
      execution.setOutput(0, op3_output);
      let list = [];
      iterations_all = Number(options.iterations) + 1;
      for (let i = 0; i < iterations_all; i++) {
        let tStart = performance.now();
        await execution.startCompute();
        let computeTime = performance.now() - tStart;
        list.push(computeTime);
      };
      let sum = 0;
      list.shift();
      let d = list.reduce((d, v) => {
        d.sum += v;
        return d;
      }, {
        sum: 0,
      });
      let avg = d.sum/list.length;
      let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "ADD", "avg": avg, "bias": "null", "weight": "null", "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": "null", "filter": "null", "padding": "null", "activation": "[${activation}]", "axis": "null", "shapeLen": "null", "shapeValues": "null"}
      data = JSON.stringify(data);
      document.getElementById("avg").insertAdjacentText("beforeend", data);
      document.getElementById("avg").insertAdjacentText("beforeend", ",");
      for (let i = 0; i < type0_length; ++i) {
        assert.isTrue(almostEqualCTS(op3_output[i], op3_expect[i]));
      }
    });
  });`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-add-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-add-${count}.js`)
  } break;
  case 1: {
    let padding = (await getOperands(context[1][1]))[0];
    let stride = (await getOperands(context[1][5]))[0];
    let filter = (await getOperands(context[1][7]))[0];
    let activation = (await getOperands(context[1][9]))[0];
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /averagepool-/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
    const assert = chai.assert;
    const nn = navigator.ml.getNeuralNetworkContext();
    it('Check result for layer-${layer} AVERAGE_POOL_2D example/${count} of ${JSON_DATA.getModelName()} model', async function() {
      let model = await nn.createModel(options);
      let operandIndex = 0;
      let i0_value;
      let output_expect;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        i0_value = file_data;
      });
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        output_expect = file_data;
      });
      let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
      let type0_length = product(type0.dimensions);
      let type1 = {type: nn.INT32};
      let type2 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
      let type2_length = product(type2.dimensions);
      let i0 = operandIndex++;
      model.addOperand(type0);
      let stride = operandIndex++;
      model.addOperand(type1);
      let filter = operandIndex++;
      model.addOperand(type1);
      let padding = operandIndex++;
      model.addOperand(type1);
      let activation = operandIndex++;
      model.addOperand(type1);
      let output = operandIndex++;
      model.addOperand(type2);
      model.setOperandValue(stride, new Int32Array([${stride}]));
      model.setOperandValue(filter, new Int32Array([${filter}]));
      model.setOperandValue(padding, new Int32Array([${padding}]));
      model.setOperandValue(activation, new Int32Array([${activation}]));
      model.addOperation(nn.AVERAGE_POOL_2D, [i0, padding, padding, padding, padding, stride, stride, filter, filter, activation], [output]);
      model.identifyInputsAndOutputs([i0], [output]);
      await model.finish();
      let compilation = await model.createCompilation();
      compilation.setPreference(getPreferenceCode(options.prefer));
      await compilation.finish();
      let execution = await compilation.createExecution();
      let i0_input = new Float32Array(i0_value);
      execution.setInput(0, i0_input);
      let output_output = new Float32Array(type2_length);
      execution.setOutput(0, output_output);
      let list = [];
      iterations_all = Number(options.iterations) + 1;
      for (let i = 0; i < iterations_all; i++) {
        let tStart = performance.now();
        await execution.startCompute();
        let computeTime = performance.now() - tStart;
        list.push(computeTime);
      };
      list.shift();
      let d = list.reduce((d, v) => {
        d.sum += v;
        return d;
      }, {
        sum: 0,
      });
      let avg = d.sum/list.length;
      let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "AVERAGE_POOL_2D", "avg": avg, "bias": "null", "weight": "null", "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": [${stride}], "filter": [${filter}], "padding": [${padding}], "activation": [${activation}], "axis": "null", "shapeLen": "null", "shapeValues": "null"}
      data = JSON.stringify(data);
      document.getElementById("avg").insertAdjacentText("beforeend", data);
      document.getElementById("avg").insertAdjacentText("beforeend", ",");
      for (let i = 0; i < type2_length; ++i) {
        assert.isTrue(almostEqualCTS(output_output[i], output_expect[i]));
      }
    });
  });`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-averagepool-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-averagepool-${count}.js`);
  } break;
  case 17:{
    let padding = (await getOperands(context[1][1]))[0];
    let stride = (await getOperands(context[1][5]))[0];
    let filter = (await getOperands(context[1][7]))[0];
    let activation = (await getOperands(context[1][9]))[0];
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /maxpool-/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
  const assert = chai.assert;
  const nn = navigator.ml.getNeuralNetworkContext();
  it('Check result for layer-${layer} MAX_POOL_2D example/${count} of ${JSON_DATA.getModelName()} model', async function() {
    let model = await nn.createModel(options);
    let operandIndex = 0;
    let i0_value;
    let output_expect;
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      i0_value = file_data;
    });
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      output_expect = file_data;
    });
    let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
    let type0_length = product(type0.dimensions);
    let type1 = {type: nn.INT32};
    let type2 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
    let type2_length = product(type2.dimensions);
    let i0 = operandIndex++;
    model.addOperand(type0);
    let stride = operandIndex++;
    model.addOperand(type1);
    let filter = operandIndex++;
    model.addOperand(type1);
    let padding = operandIndex++;
    model.addOperand(type1);
    let activation = operandIndex++;
    model.addOperand(type1);
    let output = operandIndex++;
    model.addOperand(type2);
    model.setOperandValue(stride, new Int32Array([${stride}]));
    model.setOperandValue(filter, new Int32Array([${filter}]));
    model.setOperandValue(padding, new Int32Array([${padding}]));
    model.setOperandValue(activation, new Int32Array([${activation}]));
    model.addOperation(nn.MAX_POOL_2D, [i0, padding, padding, padding, padding, stride, stride, filter, filter, activation], [output]);
    model.identifyInputsAndOutputs([i0], [output]);
    await model.finish();
    let compilation = await model.createCompilation();
    compilation.setPreference(getPreferenceCode(options.prefer));
    await compilation.finish();
    let execution = await compilation.createExecution();
    let i0_input = new Float32Array(i0_value);
    execution.setInput(0, i0_input);
    let output_output = new Float32Array(type2_length);
    execution.setOutput(0, output_output);
    let list = [];
    iterations_all = Number(options.iterations) + 1;
    for (let i = 0; i < iterations_all ; i++) {
      let tStart = performance.now();
      await execution.startCompute();
      let computeTime = performance.now() - tStart;
      list.push(computeTime);
    };
    let sum = 0;
    list.shift();
    let d = list.reduce((d, v) => {
      d.sum += v;
      return d;
    }, {
      sum: 0,
    });
    let avg = d.sum/list.length;
    let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "MAX_POOL_2D", "avg": avg, "bias": "null", "weight": "null", "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": [${stride}], "filter": [${filter}], "padding": [${padding}], "activation": [${activation}], "axis": "null", "shapeLen": "null", "shapeValues": "null"}
    data = JSON.stringify(data);
    document.getElementById("avg").insertAdjacentText("beforeend", data);
    document.getElementById("avg").insertAdjacentText("beforeend", ",");
    for (let i = 0; i < type2_length; ++i) {
      assert.isTrue(almostEqualCTS(output_output[i], output_expect[i]));
    }
  });
});`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-maxpool-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-maxpool-${count}.js`)
  } break;
  case 2: {
    let inputFile1 = context[1][1];
    let input1Dims = (await gettensorTypes(inputFile1));
    let axis = (await getOperands(context[1][2]))[0];
    await saveToLocalFile(inputFile1);
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /concatenation-/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
  const assert = chai.assert;
  const nn = navigator.ml.getNeuralNetworkContext();
  it('Check result for layer-${layer} CONCATENATION example/${count} of ${JSON_DATA.getModelName()} model', async function() {
    let model = await nn.createModel(options);
    let operandIndex = 0;
    let input1_value;
    let input2_value;
    let output_expect;
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        file_data[j] = parseFloat(text[j]);
      }
      input1_value = file_data;
    });
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile1}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      input2_value = file_data;
    });
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      output_expect = file_data;
    });
    let type2 = {type: nn.INT32};
    let type1 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
    let type1_length = product(type1.dimensions);
    let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${input1Dims}]};
    let type0_length = product(type0.dimensions);
    let type3 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
    let type3_length = product(type3.dimensions);
    let input1 = operandIndex++;
    model.addOperand(type0);
    let input2 = operandIndex++;
    model.addOperand(type1);
    let axis0 = operandIndex++;
    model.addOperand(type2);
    let output = operandIndex++;
    model.addOperand(type3);
    let input2_input = new Float32Array(input2_value);
    model.setOperandValue(input2, input2_input);
    model.setOperandValue(axis0, new Int32Array([${axis}]));
    model.addOperation(nn.CONCATENATION, [input1, input2, axis0], [output]);
    model.identifyInputsAndOutputs([input1], [output]);
    await model.finish();
    let compilation = await model.createCompilation();
    compilation.setPreference(getPreferenceCode(options.prefer));
    await compilation.finish();
    let execution = await compilation.createExecution();
    let input1_input = new Float32Array(input1_value);
    execution.setInput(0, input1_input);
    let output_output = new Float32Array(type3_length);
    execution.setOutput(0, output_output);
    let list = [];
    iterations_all = Number(options.iterations) + 1;
    for (let i = 0; i < iterations_all; i++) {
      let tStart = performance.now();
      await execution.startCompute();
      let computeTime = performance.now() - tStart;
      list.push(computeTime);
    };
    let sum = 0;
    list.shift();
    let d = list.reduce((d, v) => {
      d.sum += v;
      return d;
    }, {
      sum: 0,
    });
    let avg = d.sum/list.length;
    let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "CONCATENATION", "avg": avg, "bias": "null", "weight": "null", "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": "null", "filter": "null", "padding": "null", "activation": "null", "axis": [${axis}], "shapeLen": "null", "shapeValues": "null"}
    data = JSON.stringify(data);
    document.getElementById("avg").insertAdjacentText("beforeend", data);
    document.getElementById("avg").insertAdjacentText("beforeend", ",");
    for (let i = 0; i < type3_length; ++i) {
      assert.isTrue(almostEqualCTS(output_output[i], output_expect[i]));
    }
  });
});`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-concatenation-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-concatenation-${count}.js`);
  } break;
  case 3: {
    let weightFile = context[1][1];
    let biasFile = context[1][2];
    let weight = (await gettensorTypes(weightFile));
    let bias = (await gettensorTypes(biasFile));
    let pad = (await getOperands(context[1][3]))[0];
    let stride = (await getOperands(context[1][7]))[0];
    let act = (await getOperands(context[1][9]))[0];
    await saveToLocalFile(weightFile);
    await saveToLocalFile(biasFile);
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /conv2d-/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
  const assert = chai.assert;
  const nn = navigator.ml.getNeuralNetworkContext();
  it('Check result for layer-${layer} CONV_2D example/${count} of ${JSON_DATA.getModelName()} model', async function() {
    let model = await nn.createModel(options);
    let operandIndex = 0;
    let op1_value;
    let op4_expect;
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      op1_value = file_data;
    });
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      op4_expect = file_data;
    });
    let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
    let type0_length = product(type0.dimensions);
    let type1 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
    let type1_length = product(type1.dimensions);
    let type2 = {type: nn.TENSOR_FLOAT32, dimensions: [${bias}]};
    let type2_length = product(type2.dimensions);
    let type3 = {type: nn.INT32};
    let type4 = {type: nn.TENSOR_FLOAT32, dimensions: [${weight}]};
    let op1 = operandIndex++;
    model.addOperand(type0);
    let op2 = operandIndex++;
    model.addOperand(type4);
    let op3 = operandIndex++;
    model.addOperand(type2);
    let pad0 = operandIndex++;
    model.addOperand(type3);
    let act = operandIndex++;
    model.addOperand(type3);
    let stride = operandIndex++;
    model.addOperand(type3);
    let op4 = operandIndex++;
    model.addOperand(type1);
    let op2value;
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${weightFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      op2value = file_data;
    });
    let op3value;
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${biasFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      op3value = file_data;
    });
    model.setOperandValue(op2, new Float32Array(op2value));
    model.setOperandValue(op3, new Float32Array(op3value));
    model.setOperandValue(pad0, new Int32Array([${pad}]));
    model.setOperandValue(act, new Int32Array([${act}]));
    model.setOperandValue(stride, new Int32Array([${stride}]));
    model.addOperation(nn.CONV_2D, [op1, op2, op3, pad0, pad0, pad0, pad0, stride, stride, act], [op4]);
    model.identifyInputsAndOutputs([op1], [op4]);
    await model.finish();
    let compilation = await model.createCompilation();
    compilation.setPreference(getPreferenceCode(options.prefer));
    await compilation.finish();
    let execution = await compilation.createExecution();
    let op1_input = new Float32Array(op1_value);
    execution.setInput(0, op1_input);
    let op4_output = new Float32Array(type1_length);
    execution.setOutput(0, op4_output);
    let list = [];
    iterations_all = Number(options.iterations) + 1;
    for (let i = 0; i < iterations_all; i++) {
      let tStart = performance.now();
      await execution.startCompute();
      let computeTime = performance.now() - tStart;
      list.push(computeTime);
    };
    let sum = 0;
    list.shift();
    let d = list.reduce((d, v) => {
      d.sum += v;
      return d;
    }, {
      sum: 0,
    });
    let avg = d.sum/list.length;
    let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "CONV_2D", "avg": avg, "bias": [${bias}], "weight": [${weight}], "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": [${stride}], "filter": "null", "padding": [${pad}], "activation": [${act}], "axis": "null", "shapeLen": "null", "shapeValues": "null"}
    data = JSON.stringify(data);
    document.getElementById("avg").insertAdjacentText("beforeend", data);
    document.getElementById("avg").insertAdjacentText("beforeend", ",");
    for (let i = 0; i < type1_length; ++i) {
      assert.isTrue(almostEqualCTS(op4_output[i], op4_expect[i]));
    }
  });
});`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-conv2d-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-conv2d-${count}.js`)
  } break;
  case 4: {
    let weightFile = context[1][1];
    let biasFile = context[1][2];
    let weight = (await gettensorTypes(weightFile));
    let bias = (await gettensorTypes(biasFile));
    let pad = (await getOperands(context[1][3]))[0];
    let stride = (await getOperands(context[1][7]))[0];
    let act = (await getOperands(context[1][9]))[0];
    await saveToLocalFile(weightFile);
    await saveToLocalFile(biasFile);
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /depthwish_conv_2d/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
    const assert = chai.assert;
    const nn = navigator.ml.getNeuralNetworkContext();
    it('Check result for layer-${layer} DEPTHWISE_CONV_2D example/${count} of ${JSON_DATA.getModelName()} model', async function() {
      let model = await nn.createModel(options);
      let operandIndex = 0;
      let op1_value;
      let op4_expect;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op1_value = file_data;
      });
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op4_expect = file_data;
      });
      let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
      let type0_length = product(type0.dimensions);
      let type1 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
      let type1_length = product(type1.dimensions);
      let type2 = {type: nn.TENSOR_FLOAT32, dimensions: [${bias}]};
      let type2_length = product(type2.dimensions);
      let type3 = {type: nn.INT32};
      let type4 = {type: nn.TENSOR_FLOAT32, dimensions: [${weight}]};
      let op1 = operandIndex++;
      model.addOperand(type0);
      let op2 = operandIndex++;
      model.addOperand(type4);
      let op3 = operandIndex++;
      model.addOperand(type2);
      let pad0 = operandIndex++;
      model.addOperand(type3);
      let act = operandIndex++;
      model.addOperand(type3);
      let stride = operandIndex++;
      model.addOperand(type3);
      let channelMultiplier = operandIndex++;
      model.addOperand(type3);
      let op4 = operandIndex++;
      model.addOperand(type1);
      let op2value;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${weightFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op2value = file_data;
      });
      let op3value;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${biasFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op3value = file_data;
      });
      model.setOperandValue(op2, new Float32Array(op2value));
      model.setOperandValue(op3, new Float32Array(op3value));
      model.setOperandValue(pad0, new Int32Array([${pad}]));
      model.setOperandValue(act, new Int32Array([${act}]));
      model.setOperandValue(stride, new Int32Array([${stride}]));
      model.setOperandValue(channelMultiplier, new Int32Array([1]));
      model.addOperation(nn.DEPTHWISE_CONV_2D, [op1, op2, op3, pad0, pad0, pad0, pad0, stride, stride, channelMultiplier, act], [op4]);
      model.identifyInputsAndOutputs([op1], [op4]);
      await model.finish();
      let compilation = await model.createCompilation();
      compilation.setPreference(getPreferenceCode(options.prefer));
      await compilation.finish();
      let execution = await compilation.createExecution();
      let op1_input = new Float32Array(op1_value);
      execution.setInput(0, op1_input);
      let op4_output = new Float32Array(type1_length);
      execution.setOutput(0, op4_output);
      let list = [];
      iterations_all = Number(options.iterations) + 1;
      for (let i = 0; i < iterations_all; i++) {
        let tStart = performance.now();
        await execution.startCompute();
        let computeTime = performance.now() - tStart;
        list.push(computeTime);
      };
      let sum = 0;
      list.shift();
      let d = list.reduce((d, v) => {
        d.sum += v;
        return d;
      }, {
        sum: 0,
      });
      let avg = d.sum/list.length;
      let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "DEPTHWISE_CONV_2D", "avg": avg, "bias": [${bias}], "weight": [${weight}], "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": [${stride}], "filter": "null", "padding": [${pad}], "activation": [${act}], "axis": "null", "shapeLen": "null", "shapeValues": "null"}
      data = JSON.stringify(data);
      document.getElementById("avg").insertAdjacentText("beforeend", data);
      document.getElementById("avg").insertAdjacentText("beforeend", ",");
      for (let i = 0; i < type1_length; ++i) {
        assert.isTrue(almostEqualCTS(op4_output[i], op4_expect[i]));
      }
    });
  });`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-depthwish_conv_2d-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-depthwish_conv_2d-${count}.js`)
  } break;
  case 9:{
    let weightFile = context[1][1];
    let biasFile = context[1][2];
    let weight = (await gettensorTypes(weightFile));
    let bias = (await gettensorTypes(biasFile));
    await saveToLocalFile(weightFile);
    await saveToLocalFile(biasFile);
    let activation = (await getOperands(context[1][3]))[0];
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /fully-connected/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
    const assert = chai.assert;
    const nn = navigator.ml.getNeuralNetworkContext();
    it('Check result for layer-${layer} FULLY_CONNECTED example/${count} of ${JSON_DATA.getModelName()} model', async function() {
      let model = await nn.createModel(options);
      let operandIndex = 0;
      let op1_value;
      let output_expect;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op1_value = file_data;
      });
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        output_expect = file_data;
      });
      let type4 = {type: nn.INT32};
      let type1 = {type: nn.TENSOR_FLOAT32, dimensions: [${weight}]};
      let type1_length = product(type1.dimensions);
      let type2 = {type: nn.TENSOR_FLOAT32, dimensions: [${bias}]};
      let type2_length = product(type2.dimensions);
      let type3 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
      let type3_length = product(type3.dimensions);
      let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
      let type0_length = product(type0.dimensions);

      let op1 = operandIndex++;
      model.addOperand(type0);
      let op2 = operandIndex++;
      model.addOperand(type1);
      let b0 = operandIndex++;
      model.addOperand(type2);
      let op3 = operandIndex++;
      model.addOperand(type3);
      let act = operandIndex++;
      model.addOperand(type4);
      let op2value;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${weightFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op2value = file_data;
      });
      let op3value;
      await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${biasFile}').then((res) => {
        return res.json();
      }).then((text) => {
        let file_data = new Float32Array(text.length);
        for (let j in text) {
          let b = parseFloat(text[j]);
          file_data[j] = b;
        }
        op3value = file_data;
      });

      model.setOperandValue(op2, new Float32Array(op2value));
      model.setOperandValue(b0, new Float32Array(op3value));
      model.setOperandValue(act, new Int32Array([${activation}]));
      model.addOperation(nn.FULLY_CONNECTED, [op1, op2, b0, act], [op3]);

      model.identifyInputsAndOutputs([op1], [op3]);
      await model.finish();

      let compilation = await model.createCompilation();
      compilation.setPreference(getPreferenceCode(options.prefer));
      await compilation.finish();

      let execution = await compilation.createExecution();

      let op1_input = new Float32Array(op1_value);
      execution.setInput(0, op1_input);

      let op3_output = new Float32Array(type3_length);
      execution.setOutput(0, op3_output);
      let list = [];
      iterations_all = Number(options.iterations) + 1;
      for (let i = 0; i < iterations_all ; i++) {
        let tStart = performance.now();
        await execution.startCompute();
        let computeTime = performance.now() - tStart;
        list.push(computeTime);
      };
      let sum = 0;
      list.shift();
      let d = list.reduce((d, v) => {
        d.sum += v;
        return d;
      }, {
        sum: 0,
      });
      let avg = d.sum/list.length;
      let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "FULLY_CONNECTED", "avg": avg, "bias": "null", "weight": "null", "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": "null", "filter": "null", "padding": "null", "activation": [${activation}], "axis": "null", "shapeLen": "null", "shapeValues": "null"}
      data = JSON.stringify(data);
      document.getElementById("avg").insertAdjacentText("beforeend", data);
      document.getElementById("avg").insertAdjacentText("beforeend", ",");
      for (let i = 0; i < type2_length; ++i) {
        assert.isTrue(almostEqualCTS(op3_output[i], output_expect[i]));
      }
    });
  });`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-fully-connected-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-fully-connected-${count}.js`)
  } break;
  case 22: {
    let shapeDic = await getOperands(context[1][1]);
    let shapeLen = Object.keys(shapeDic).length;
    let shapeValues = Object.values(shapeDic);
    let savePath = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
    var readDir = fs.readdirSync(savePath);
    let count = 1;
    for (let i in readDir) {
      regex = /reshape-/;
      matchFlat = regex.test(readDir[i]);
      if (matchFlat) {
        count ++;
      }
    };
    let layer = result.length + 1;
    let caseSample = `describe('CTS Real Model Test', function() {
  const assert = chai.assert;
  const nn = navigator.ml.getNeuralNetworkContext();
  it('Check result for layer-${layer} RESHAPE example/${count} of ${JSON_DATA.getModelName()} model', async function() {
    let model = await nn.createModel(options);
    let operandIndex = 0;
    let op1_value;
    let op3_expect;
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${inputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      op1_value = file_data;
    });
    await fetch('./realmodel/testcase/res/${JSON_DATA.getModelName()}/${outputFile}').then((res) => {
      return res.json();
    }).then((text) => {
      let file_data = new Float32Array(text.length);
      for (let j in text) {
        let b = parseFloat(text[j]);
        file_data[j] = b;
      }
      op3_expect = file_data;
    });
    let type0 = {type: nn.TENSOR_FLOAT32, dimensions: [${inputDims}]};
    let type0_length = product(type0.dimensions);
    let type2 = {type: nn.TENSOR_FLOAT32, dimensions: [${outputDims}]};
    let type2_length = product(type2.dimensions);
    let type1 = {type: nn.TENSOR_INT32, dimensions: [${shapeLen}]};
    let type1_length = product(type1.dimensions);
    let op1 = operandIndex++;
    model.addOperand(type0);
    let op2 = operandIndex++;
    model.addOperand(type1);
    let op3 = operandIndex++;
    model.addOperand(type2);
    model.setOperandValue(op2, new Int32Array([${shapeValues}]));
    model.addOperation(nn.RESHAPE, [op1, op2], [op3]);
    model.identifyInputsAndOutputs([op1], [op3]);
    await model.finish();
    let compilation = await model.createCompilation();
    compilation.setPreference(getPreferenceCode(options.prefer));
    await compilation.finish();
    let execution = await compilation.createExecution();
    let op1_input = new Float32Array(op1_value);
    execution.setInput(0, op1_input);
    let op3_output = new Float32Array(type2_length);
    execution.setOutput(0, op3_output);
    let list = [];
    iterations_all = Number(options.iterations) + 1;
    for (let i = 0; i < iterations_all; i++) {
      let tStart = performance.now();
      await execution.startCompute();
      let computeTime = performance.now() - tStart;
      list.push(computeTime);
    };
    let sum = 0;
    list.shift();
    let d = list.reduce((d, v) => {
      d.sum += v;
      return d;
    }, {
      sum: 0,
    });
    let avg = d.sum/list.length;
    let data = {"layer": "layer-${layer}", "Model": "${JSON_DATA.getModelName()}", "Ops": "RESHAPE", "avg": avg, "bias": "null", "weight": "null", "input dimensions": [${inputDims}], "output dimensions": [${outputDims}], "stride": "null", "filter": "null", "padding": "null", "activation": "null", "axis": "null", "shapeLen": [${shapeLen}], "shapeValues": [${shapeValues}]}
    data = JSON.stringify(data);
    document.getElementById("avg").insertAdjacentText("beforeend", data);
    document.getElementById("avg").insertAdjacentText("beforeend", ",");
    for (let i = 0; i < type2_length; ++i) {
      assert.isTrue(almostEqualCTS(op3_output[i], op3_expect[i]));
    }
  });
});`;
    await saveCaseToLocal(caseSample, `${JSON_DATA.getModelName()}-reshape-${count}.js`);
    result.push(`${JSON_DATA.getModelName()}-reshape-${count}.js`)
  }break;
  }
}

async function findSync(startPath) {
  String.prototype.endWith = function (endStr) {
    let d = this.length - endStr.length;
    return (d >= 0 && this.lastIndexOf(endStr) == d);
  };
  let files = fs.readdirSync(startPath);
  let saveFileDirs = path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`);
  let saveStream = fs.createWriteStream(
    path.join(saveFileDirs, `${JSON_DATA.getModelName()}.txt`),
    {flags: 'w', encoding: 'utf-8'}
  );
  saveStream.on('error', (err) => {
    console.error(err);
  });
  saveStream.write(JSON.stringify(result));
  saveStream.end();
}

async function generateCase(input) {
  if (input.hasOwnProperty('operations')) {
    for (let i = 0; i < input.operations.length; i++) {
      await splitContext(input.operations[i]);
    }
    await findSync(path.join(__dirname, '..', 'testcase', `${JSON_DATA.getModelName()}`));
  }
}
