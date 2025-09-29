import os
from moviepy.editor import VideoFileClip, concatenate_videoclips, TextClip, CompositeVideoClip, vfx
import cv2
import whisper
import numpy as np

# ----------------------------
# 1. اختيار أول ملف mp4 في المجلد تلقائيًا
# ----------------------------
video_files = [f for f in os.listdir('.') if f.endswith('.mp4')]
if not video_files:
    raise Exception("لا يوجد أي ملف MP4 في المجلد!")
video_file = video_files[0]
print(f"يتم استخدام الفيديو: {video_file}")

video = VideoFileClip(video_file)

# ----------------------------
# 2. كشف المشاهد الذكي
# ----------------------------
def detect_scenes(video_path, threshold=30):
    cap = cv2.VideoCapture(video_path)
    scenes = [0]
    ret, prev_frame = cap.read()
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(gray, prev_gray)
        non_zero_count = cv2.countNonZero(diff)
        if non_zero_count > threshold*1000:
            scenes.append(frame_idx / cap.get(cv2.CAP_PROP_FPS))
        prev_gray = gray
        frame_idx += 1

    cap.release()
    scenes.append(video.duration)
    return scenes

scene_times = detect_scenes(video_file)
scene_clips = [video.subclip(scene_times[i], scene_times[i+1]) for i in range(len(scene_times)-1)]

# ----------------------------
# 3. تحسين المشاهد بصرياً
# ----------------------------
enhanced_clips = [clip.fx(vfx.colorx, 1.3).fx(vfx.lum_contrast, lum=15, contrast=25) for clip in scene_clips]

# ----------------------------
# 4. دمج المشاهد
# ----------------------------
final_clip = concatenate_videoclips(enhanced_clips, method="compose")

# ----------------------------
# 5. توليد نصوص ديناميكية من الصوت
# ----------------------------
model = whisper.load_model("base")
result = model.transcribe(video_file)

text_clips = []
for segment in result['segments']:
    txt = TextClip(segment['text'], fontsize=30, color='white', stroke_color='gold', stroke_width=2, method='caption')
    txt = txt.set_start(segment['start']).set_duration(segment['end'] - segment['start']).set_position(('center','bottom'))
    txt = txt.fx(vfx.fadein, 0.5).fx(vfx.fadeout,0.5).fx(vfx.scroll, w=0, h=-50)
    text_clips.append(txt)

# ----------------------------
# 6. إضافة تأثيرات فرعونية/روحانية
# ----------------------------
ascii_effect = TextClip("✦ ✧ Om Mani Padme Hum ✧ ✦", fontsize=24, color='cyan', method='label')
ascii_effect = ascii_effect.set_duration(final_clip.duration).set_position(('center','top')).fx(vfx.fadein,1).fx(vfx.fadeout,1)

def add_glow(clip, intensity=0.2):
    return clip.fx(vfx.colorx, 1 + intensity)

final_clip_glow = add_glow(final_clip, intensity=0.2)

# ----------------------------
# 7. دمج كل شيء
# ----------------------------
final_video = CompositeVideoClip([final_clip_glow, *text_clips, ascii_effect])

# ----------------------------
# 8. تصدير الفيديو النهائي
# ----------------------------
output_file = "final_ultimate_ready_for_capcut.mp4"
final_video.write_videofile(output_file, fps=24)

print(f"تم الانتهاء! الفيديو جاهز: {output_file}")