# frames + mix + captions -> the finished MP4 (1080x1920, 30 fps, H.264 + AAC)
#   python3 encode.py FRAMES_DIR TOTAL_FRAMES MIX.wav CAPS_DIR OUT.mp4
# Frames rendered smaller (e.g. 540 or 720 wide) are upscaled with lanczos; captions (from captions/build.py at
# 1080x1920) sit in their band at y = 0.606 * 1920; the audio is trimmed/padded to exactly TOTAL/30 s.
import sys, os, subprocess
fr, total, mix, caps, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
miss = [i for i in range(total) if not os.path.exists(os.path.join(fr, "f_%05d.png" % i))]
if miss: sys.exit("missing frames: %d (first %s) - finish the render first" % (len(miss), miss[:10]))
T = total / 30.0; y = round(1920 * (0.686 - 0.16 / 2))
cmd = ["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(fr, "f_%05d.png"),
       "-f", "concat", "-safe", "0", "-i", os.path.join(caps, "list.txt"), "-i", mix,
       "-filter_complex", "[0:v]scale=1080:1920:flags=lanczos,format=rgba[b];[1:v]format=rgba[c];[b][c]overlay=0:%d:shortest=0,format=yuv420p[v];[2:a]apad,atrim=0:%.4f[a]" % (y, T),
       "-map", "[v]", "-map", "[a]", "-frames:v", str(total), "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]
subprocess.run(cmd, check=True)
p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=nb_frames", "-of", "csv=p=0", out], capture_output=True, text=True).stdout.split()
print("ENCODED", out, p)
