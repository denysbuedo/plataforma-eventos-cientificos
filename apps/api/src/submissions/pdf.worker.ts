import { parentPort, workerData } from 'node:worker_threads';
import { PDFDocument, PDFDict, PDFArray, PDFName } from 'pdf-lib';
try {
  const document = await PDFDocument.load(new Uint8Array(workerData), { updateMetadata: false, throwOnInvalidObject: true });
  if (document.isEncrypted) throw new Error('encrypted');
  const forbidden = ['JavaScript','JS','EmbeddedFiles','Launch','RichMedia','OpenAction','AA','XFA'];
  const actions = ['JavaScript','Launch','SubmitForm','ImportData','Rendition','GoToE'];
  const seen = new Set<unknown>();
  const inspect = (object: unknown) => {
    if (seen.has(object)) return;
    seen.add(object);
    if (object instanceof PDFDict) {
      if (forbidden.some((key) => object.has(PDFName.of(key)))) throw new Error('active content');
      const action = object.get(PDFName.of('S'));
      if (action instanceof PDFName && actions.includes(action.decodeText())) throw new Error('active action');
      for (const [, value] of object.entries()) inspect(value);
    } else if (object instanceof PDFArray) {
      for (let index = 0; index < object.size(); index++) inspect(object.get(index));
    }
  };
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    inspect(object);
  }
  const pages = document.getPageCount(); if (pages < 1 || pages > 500) throw new Error('pages');
  parentPort?.postMessage({ pages });
} catch { parentPort?.postMessage({ error: true }); }
