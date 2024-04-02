import { Sendable } from '../../models/Sendable';
import { TaskBuilder } from '../../models/TaskBuilder';
import { htmlToElement } from '../../utils/dom';
import { Parser } from '../Parser';

export class DeeplearningProblemParser extends Parser {
  public getMatchPatterns(): string[] {
    return [
      'https://deeplearning.org.cn/group/*/training/*/problem/*/full-screen',
      'https://deeplearning.org.cn/problem/*',
    ];
  }

  public async parse(url: string, html: string): Promise<Sendable> {
    const elem = htmlToElement(html);
    const task = new TaskBuilder('Deeplearning').setUrl(url);

    this.parseFromPage(task, elem);

    return task.build();
  }

  private parseFromPage(task: TaskBuilder, elem: Element): void {
    task.setName(elem.querySelector('.panel-title > span').textContent.trim());

    const timeLimitStr = elem.querySelector('.question-intr > span:nth-child(1)').textContent.split(' ')[1];
    task.setTimeLimit(parseFloat(timeLimitStr) * 1000);

    const memoryLimitStr = elem.querySelector('.question-intr > span:nth-child(3)').textContent.split(' ')[1];
    task.setMemoryLimit(parseInt(memoryLimitStr));

    elem.querySelectorAll('.example').forEach(sample => {
      const input = sample.querySelector('.example-input > pre').textContent;
      const output = sample.querySelector('.example-output > pre').textContent;

      task.addTest(input, output);
    });
  }

  private parseFromScript(task: TaskBuilder, elem: Element): void {
    for (const scriptElem of elem.querySelectorAll('script')) {
      const script = scriptElem.textContent;
      if (script.startsWith('window._feInjection')) {
        const startQuoteIndex = script.indexOf('"');
        const endQuoteIndex = script.substr(startQuoteIndex + 1).indexOf('"');
        const encodedData = script.substr(startQuoteIndex + 1, endQuoteIndex);

        const data = JSON.parse(decodeURIComponent(encodedData)).currentData.problem;

        task.setName(`${data.pid} ${data.title}`.trim());

        task.setTimeLimit(Math.max(...data.limits.time));
        task.setMemoryLimit(Math.max(...data.limits.memory) / 1024);

        for (const sample of data.samples) {
          task.addTest(sample[0], sample[1]);
        }

        return;
      }
    }

    throw new Error('Failed to find problem data');
  }
}
