// Independent ONNX CPU reference for the pinned browser model.
import { AutoTokenizer, AutoModelForCausalLM, Tensor } from '@huggingface/transformers';
import { writeFile } from 'node:fs/promises';
const modelId = 'Xenova/gpt2';
const revision = 'bf2c7f02e0b826c60d03af341171bde20893da66';
const tokenizer = await AutoTokenizer.from_pretrained(modelId, { revision });
const model = await AutoModelForCausalLM.from_pretrained(modelId, { revision, device: 'cpu', dtype: 'fp32', model_file_name: 'model' });
const examples = [];
for (const prompt of ['The sky is', 'The capital of France is', 'One plus one equals']) {
  const inputs = await tokenizer(prompt);
  const out = await model(inputs);
  const logits = Array.from(out.logits.data.slice(-out.logits.dims.at(-1)), Number);
  const order = logits.map((_, id) => id).sort((a,b)=>logits[b]-logits[a]);
  const peak = logits[order[0]];
  const sum = logits.reduce((s,l)=>s+Math.exp(l-peak),0);
  examples.push({prompt, topk:order.slice(0,5).map(id=>({id, text:tokenizer.decode([id]), logit:logits[id], prob:Math.exp(logits[id]-peak)/sum}))});
  for (const v of Object.values(out)) if (v instanceof Tensor) v.dispose();
}
await model.dispose();
const result = {model:modelId, revision, runtime:'transformers.js@3.8.1 / ONNX CPU', dtype:'fp32', examples};
await writeFile(new URL('../tests/fixtures/browser-gpt2-reference.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
