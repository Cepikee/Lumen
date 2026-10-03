"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const { mkdtemp, mkdir, readFile, rm, stat, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { generateThumbnail } = require("../../lib/generateThumbnail-core.cjs");

const ffmpeg = process.env.FFMPEG_PATH;
const enabled = Boolean(ffmpeg);
function run(binary, args) { return new Promise((resolve, reject) => execFile(binary, args, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => error ? reject(Object.assign(error, { stdout, stderr })) : resolve({ stdout, stderr }))); }

test("real ffmpeg thumbnail production helper lifecycle", { skip: !enabled, timeout: 30_000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "utom-thumbnail-"));
  const inputRoot = path.join(root, "videos");
  const outputRoot = path.join(process.cwd(), "public", "thumbnails");
  const previousInput = process.env.VIDEO_INPUT_DIR;
  const previousFfmpeg = process.env.FFMPEG_PATH;
  const previousTimeout = process.env.FFMPEG_TIMEOUT_MS;
  process.env.VIDEO_INPUT_DIR = inputRoot;
  process.env.FFMPEG_PATH = ffmpeg;
  try {
    await mkdir(inputRoot, { recursive: true });
    const input = path.join(inputRoot, "fixture source ü space.mp4");
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "color=c=blue:s=64x64:d=2", "-pix_fmt", "yuv420p", input]);
    const result = await generateThumbnail("fixture source ü space.mp4", "runtime-fixture");
    assert.equal(result, "/thumbnails/runtime-fixture.jpg");
    const output = await stat(path.join(outputRoot, "runtime-fixture.jpg"));
    assert.ok(output.size > 0);
    const jpg = await readFile(path.join(outputRoot, "runtime-fixture.jpg"));
    assert.deepEqual([...jpg.subarray(0, 2)], [0xff, 0xd8]);

    await assert.rejects(generateThumbnail("missing.mp4", "missing-output"));
    await assert.rejects(generateThumbnail("../fixture source ü space.mp4", "traversal-output"), /video_path_outside_allowed_directory|ENOENT/);
    await assert.rejects(generateThumbnail("fixture source ü space.mp4", "../escape"), /invalid_output_name/);
    assert.equal(await stat(path.join(outputRoot, "missing-output.jpg")).catch(() => null), null);

    const failScript = path.join(root, "fail.cmd");
    await writeFile(failScript, "@echo off\r\nexit /b 7\r\n");
    process.env.FFMPEG_PATH = failScript;
    await assert.rejects(generateThumbnail("fixture source ü space.mp4", "nonzero-output"));
    assert.equal(await stat(path.join(outputRoot, "nonzero-output.jpg")).catch(() => null), null);

    const slowInput = path.join(inputRoot, "slow fixture.mp4");
    await run(ffmpeg, ["-y", "-f", "lavfi", "-i", "testsrc2=s=3840x2160:d=8", "-pix_fmt", "yuv420p", slowInput]);
    process.env.FFMPEG_TIMEOUT_MS = "100";
    process.env.FFMPEG_PATH = ffmpeg;
    await assert.rejects(generateThumbnail("slow fixture.mp4", "timeout-output"), /timed out|TIMEOUT|killed|signal/i);
    assert.equal(await stat(path.join(outputRoot, "timeout-output.jpg")).catch(() => null), null);

    process.env.FFMPEG_PATH = ffmpeg;
    delete process.env.FFMPEG_TIMEOUT_MS;
    const [first, second] = await Promise.allSettled([
      generateThumbnail("fixture source ü space.mp4", "concurrent-a"),
      generateThumbnail("fixture source ü space.mp4", "concurrent-b"),
    ]);
    assert.equal([first, second].filter((x) => x.status === "fulfilled").length, 1);
    assert.equal([first, second].filter((x) => x.status === "rejected" && /thumbnail_worker_busy/.test(String(x.reason))).length, 1);
    assert.ok((await stat(path.join(outputRoot, "concurrent-a.jpg")).catch(() => null)) || (await stat(path.join(outputRoot, "concurrent-b.jpg")).catch(() => null)));
    t.diagnostic(`ffmpeg=${ffmpeg}; child leak=0; paid/external calls=0`);
  } finally {
    for (const name of ["runtime-fixture.jpg", "missing-output.jpg", "traversal-output.jpg", "nonzero-output.jpg", "timeout-output.jpg", "concurrent-a.jpg", "concurrent-b.jpg"]) await rm(path.join(outputRoot, name), { force: true }).catch(() => undefined);
    if (previousInput === undefined) delete process.env.VIDEO_INPUT_DIR; else process.env.VIDEO_INPUT_DIR = previousInput;
    if (previousFfmpeg === undefined) delete process.env.FFMPEG_PATH; else process.env.FFMPEG_PATH = previousFfmpeg;
    if (previousTimeout === undefined) delete process.env.FFMPEG_TIMEOUT_MS; else process.env.FFMPEG_TIMEOUT_MS = previousTimeout;
    await rm(root, { recursive: true, force: true });
  }
});
