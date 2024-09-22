import { exec } from "child_process";
import fs from "fs";
import path from "path";

type Result = {
    score: number;
    runtime: number;
    memory: number;
    text: string;
}

export default async function run(problem_id: string, code: string, input_path: string): Promise<Result> {
    const root = path.join(process.cwd(), `problems/${problem_id}/`);
    const info = String(fs.readFileSync(path.join(root, `info.txt`), 'utf-8'));
    const grader = path.join(root, "grader.cpp");
    const grader_exc = path.join(root, "grader");

    const runtime_limit = parseInt(info.split(/\s+/)[0], 10);
    const memory_limit = parseInt(info.split(/\s+/)[1], 10);
    const code_path = path.join(root, String(info.split(/\s+/)[3]));
    fs.writeFileSync(code_path, code);

    return new Promise((resolve) => {
        exec(`g++ -std=c++17 -O2 -pipe -static -s ${grader} -o ${grader_exc}`, (compile_error) => {
            if (compile_error) {
                if (fs.existsSync(code_path)) fs.unlinkSync(code_path);
                if (fs.existsSync(grader_exc + '.exe')) fs.unlinkSync(grader_exc + '.exe');
                resolve({
                    score: 0,
                    runtime: 0,
                    memory: 0,
                    text: `Compilation Error: ${compile_error.message}`,
                });
                return;
            }
            if (!fs.existsSync(grader_exc + '.exe')) {
                console.error('Executable not created:', grader_exc);
                resolve({
                    score: 0,
                    runtime: 0,
                    memory: 0,
                    text: `Executable not created at path: ${grader_exc}`,
                });
                return;
            }
            exec(`/usr/bin/time -v ${grader_exc} < ${input_path}`, { timeout: runtime_limit + 1000 }, (runError, stdout, stderr) => {
                if (fs.existsSync(code_path)) fs.unlinkSync(code_path);
                if (fs.existsSync(grader_exc + '.exe')) fs.unlinkSync(grader_exc + '.exe');

                const lines = stderr.split('\n');
                let runtime = 0;
                let memory = 0;

                lines.forEach(line => {
                    if (line.includes('Elapsed (wall clock) time (h:mm:ss or m:ss):')) {
                        const time_str = line.split(': ')[1];
                        const time_parts = time_str.split(':').map(Number);
                        runtime = time_parts.length === 2 ? time_parts[0] * 60 + time_parts[1] : time_parts[0];
                    }
                    if (line.includes('Maximum resident set size (kbytes):')) {
                        memory = Number(line.split(': ')[1]);
                    }
                });

                if (runError || runtime > runtime_limit || memory > memory_limit) {
                    if (stderr.includes("timed out") || runtime > runtime_limit || runError?.killed) {
                        resolve({
                            score: 0,
                            runtime: runtime,
                            memory: memory,
                            text: "Time Limit Exceeded",
                        });
                        return;
                    }
                    if (stderr.includes("killed") || memory > memory_limit) {
                        resolve({
                            score: 0,
                            runtime: runtime,
                            memory: memory,
                            text: "Memory Limit Exceeded",
                        });
                        return;
                    }
                    resolve({
                        score: 0,
                        runtime: runtime,
                        memory: memory,
                        text: `Signal Error: ${stderr}`,
                    });
                    return;
                }

                resolve({
                    score: 1,
                    runtime: runtime,
                    memory: memory,
                    text: stdout,
                });
            });
        });
    });
}