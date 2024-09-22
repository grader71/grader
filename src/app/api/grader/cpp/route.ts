import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import run from "./run"

type Result = {
    score: number;
    runtime: number;
    memory: number;
    text: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<Result>> {
    const { problem_id, code } = await req.json();
    const root = path.join(process.cwd(), `problems/${problem_id}`);
    const files = fs.readdirSync(root);
    for (const file of files) {
        if (file.endsWith(".txt")) {
            continue;
        } else if (file.endsWith(".in")) {
            const input_path = path.join(root, file);
            const out = await run(problem_id, code, input_path);
            console.log(out);
        } else if (!file.endsWith(".out")) {
            const sub_root = path.join(root, file);
            const sub_files = fs.readdirSync(sub_root);
            for (const sub_file of sub_files) {
                if (sub_file.endsWith(".in")) {
                    const input_path = path.join(sub_root, sub_file);
                    const out = await run(problem_id, code, input_path);
                    console.log(out);
                }
            }
        }
    }
    return NextResponse.json({
        score: 0,
        runtime: 0,
        memory: 0,
        text: "0",
    });
}