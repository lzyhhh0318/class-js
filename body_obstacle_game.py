import cv2
import mediapipe as mp
import numpy as np
import random
import time
import sys


mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


GAME_W = 960
GAME_H = 540
GROUND_Y = 460
PLAYER_W = 50
PLAYER_H = 70
PLAYER_DUCK_H = 35
GRAVITY = 0.8
JUMP_VELOCITY = -15
FPS = 30


class Player:
    def __init__(self):
        self.x = 150
        self.y = GROUND_Y - PLAYER_H
        self.w = PLAYER_W
        self.h = PLAYER_H
        self.vy = 0
        self.is_jumping = False
        self.is_ducking = False
        self.target_x = self.x
        self.color = (50, 200, 50)

    def update(self, move_delta, duck, jump):
        self.target_x = 150 + move_delta
        self.target_x = max(30, min(GAME_W - self.w - 30, self.target_x))
        self.x += (self.target_x - self.x) * 0.3

        if duck and not self.is_jumping:
            self.is_ducking = True
            self.h = PLAYER_DUCK_H
            self.y = GROUND_Y - PLAYER_DUCK_H
        else:
            self.is_ducking = False
            self.h = PLAYER_H
            if not self.is_jumping:
                self.y = GROUND_Y - PLAYER_H

        if jump and not self.is_jumping and not self.is_ducking:
            self.is_jumping = True
            self.vy = JUMP_VELOCITY

        if self.is_jumping:
            self.vy += GRAVITY
            self.y += self.vy
            if self.y >= GROUND_Y - self.h:
                self.y = GROUND_Y - self.h
                self.is_jumping = False
                self.vy = 0

    def get_rect(self):
        return (int(self.x), int(self.y), self.w, self.h)

    def draw(self, frame):
        x, y, w, h = self.get_rect()
        cv2.rectangle(frame, (x, y), (x + w, y + h), self.color, -1)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 255, 255), 2)
        if self.is_ducking:
            cv2.putText(frame, "DUCK", (x + 2, y + h - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        elif self.is_jumping:
            cv2.putText(frame, "JUMP", (x + 2, y + 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        else:
            eye_y = y + 12
            cv2.circle(frame, (x + w // 3, eye_y), 4, (255, 255, 255), -1)
            cv2.circle(frame, (x + 2 * w // 3, eye_y), 4, (255, 255, 255), -1)
            cv2.circle(frame, (x + w // 3, eye_y), 2, (0, 0, 0), -1)
            cv2.circle(frame, (x + 2 * w // 3, eye_y), 2, (0, 0, 0), -1)


class Obstacle:
    HIGH = "high"
    LOW = "low"

    def __init__(self, obs_type, x, speed):
        self.type = obs_type
        self.x = float(x)
        self.speed = speed
        if obs_type == self.HIGH:
            self.w = 40
            self.h = 30
            self.y = GROUND_Y - PLAYER_H - 10
            self.color = (0, 0, 220)
        else:
            self.w = 30
            self.h = 60
            self.y = GROUND_Y - 60
            self.color = (0, 165, 255)

    def update(self):
        self.x -= self.speed

    def get_rect(self):
        return (int(self.x), int(self.y), self.w, self.h)

    def draw(self, frame):
        x, y, w, h = self.get_rect()
        cv2.rectangle(frame, (x, y), (x + w, y + h), self.color, -1)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 255, 255), 2)
        if self.type == self.HIGH:
            cv2.putText(frame, "H", (x + 12, y + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        else:
            cv2.putText(frame, "L", (x + 8, y + 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    def is_off_screen(self):
        return self.x + self.w < 0


def rects_overlap(r1, r2):
    x1, y1, w1, h1 = r1
    x2, y2, w2, h2 = r2
    return not (x1 + w1 < x2 or x2 + w2 < x1 or y1 + h1 < y2 or y2 + h2 < y1)


class PoseDetector:
    def __init__(self):
        self.pose = mp_pose.Pose(
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.prev_shoulder_y = None
        self.smooth_spine_x = 0.5
        self.smooth_shoulder_y = 0.5
        self.smooth_hip_y = 0.5
        self.smooth_knee_angle = 180

    def process(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)
        return results

    def get_controls(self, landmarks, frame_w, frame_h):
        if landmarks is None:
            return 0, False, False

        def lm(idx):
            return landmarks[idx]

        left_shoulder = lm(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
        right_shoulder = lm(mp_pose.PoseLandmark.RIGHT_SHOULDER.value)
        left_hip = lm(mp_pose.PoseLandmark.LEFT_HIP.value)
        right_hip = lm(mp_pose.PoseLandmark.RIGHT_HIP.value)
        left_knee = lm(mp_pose.PoseLandmark.LEFT_KNEE.value)
        right_knee = lm(mp_pose.PoseLandmark.RIGHT_KNEE.value)
        nose = lm(mp_pose.PoseLandmark.NOSE.value)

        spine_x = (left_shoulder.x + right_shoulder.x) / 2
        shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
        hip_y = (left_hip.y + right_hip.y) / 2

        alpha = 0.4
        self.smooth_spine_x = alpha * spine_x + (1 - alpha) * self.smooth_spine_x
        self.smooth_shoulder_y = alpha * shoulder_y + (1 - alpha) * self.smooth_shoulder_y
        self.smooth_hip_y = alpha * hip_y + (1 - alpha) * self.smooth_hip_y

        move_delta = (0.5 - self.smooth_spine_x) * GAME_W * 1.2

        left_knee_angle = _angle_between(
            (left_hip.x, left_hip.y),
            (left_knee.x, left_knee.y),
            (lm(mp_pose.PoseLandmark.LEFT_ANKLE.value).x,
             lm(mp_pose.PoseLandmark.LEFT_ANKLE.value).y),
        )
        right_knee_angle = _angle_between(
            (right_hip.x, right_hip.y),
            (right_knee.x, right_knee.y),
            (lm(mp_pose.PoseLandmark.RIGHT_ANKLE.value).x,
             lm(mp_pose.PoseLandmark.RIGHT_ANKLE.value).y),
        )
        avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
        self.smooth_knee_angle = alpha * avg_knee_angle + (1 - alpha) * self.smooth_knee_angle

        duck = self.smooth_knee_angle < 140 or self.smooth_hip_y > 0.62

        jump = False
        if self.prev_shoulder_y is not None:
            delta_y = self.prev_shoulder_y - self.smooth_shoulder_y
            jump = delta_y > 0.04 and self.smooth_shoulder_y < 0.35
        self.prev_shoulder_y = self.smooth_shoulder_y

        return move_delta, duck, jump

    def draw_landmarks(self, frame, results):
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3),
                mp_drawing.DrawingSpec(color=(255, 128, 0), thickness=2),
            )


def _angle_between(a, b, c):
    ba = np.array([a[0] - b[0], a[1] - b[1]])
    bc = np.array([c[0] - b[0], c[1] - b[1]])
    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    return np.degrees(np.arccos(cos_angle))


class Game:
    STATE_READY = 0
    STATE_PLAYING = 1
    STATE_OVER = 2

    def __init__(self):
        self.player = Player()
        self.obstacles = []
        self.score = 0
        self.lives = 3
        self.state = self.STATE_READY
        self.base_speed = 4.0
        self.speed = self.base_speed
        self.difficulty = 1
        self.spawn_timer = 0
        self.spawn_interval = 70
        self.invincible_timer = 0
        self.pose_detector = PoseDetector()
        self.cap = None
        self.cam_w = 320
        self.cam_h = 180
        self.last_controls = (0, False, False)
        self.bg_offset = 0
        self.particles = []

    def open_camera(self):
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            print("无法打开摄像头，请检查摄像头连接")
            sys.exit(1)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    def close_camera(self):
        if self.cap:
            self.cap.release()

    def reset(self):
        self.player = Player()
        self.obstacles = []
        self.score = 0
        self.lives = 3
        self.speed = self.base_speed
        self.difficulty = 1
        self.spawn_timer = 0
        self.spawn_interval = 70
        self.invincible_timer = 0
        self.particles = []

    def spawn_obstacle(self):
        obs_type = random.choice([Obstacle.HIGH, Obstacle.LOW])
        self.obstacles.append(Obstacle(obs_type, GAME_W + 20, self.speed))

    def add_particles(self, x, y, color, count=8):
        for _ in range(count):
            vx = random.uniform(-3, 3)
            vy = random.uniform(-5, 0)
            life = random.randint(10, 25)
            self.particles.append([x, y, vx, vy, life, color])

    def update_particles(self):
        alive = []
        for p in self.particles:
            p[0] += p[2]
            p[1] += p[3]
            p[3] += 0.3
            p[4] -= 1
            if p[4] > 0:
                alive.append(p)
        self.particles = alive

    def update(self):
        if self.state != self.STATE_PLAYING:
            return

        move_delta, duck, jump = self.last_controls
        self.player.update(move_delta, duck, jump)

        self.spawn_timer += 1
        if self.spawn_timer >= self.spawn_interval:
            self.spawn_obstacle()
            self.spawn_timer = 0
            self.spawn_interval = max(30, 70 - self.difficulty * 5 + random.randint(-10, 10))

        for obs in self.obstacles:
            obs.update()

        if self.invincible_timer > 0:
            self.invincible_timer -= 1

        for obs in self.obstacles:
            if rects_overlap(self.player.get_rect(), obs.get_rect()):
                if self.invincible_timer <= 0:
                    self.lives -= 1
                    self.invincible_timer = 45
                    self.add_particles(self.player.x + self.player.w // 2,
                                       self.player.y + self.player.h // 2,
                                       (0, 0, 255), 15)
                    if self.lives <= 0:
                        self.state = self.STATE_OVER

        passed = [o for o in self.obstacles if o.is_off_screen()]
        self.score += len(passed)
        self.obstacles = [o for o in self.obstacles if not o.is_off_screen()]

        self.difficulty = 1 + self.score // 5
        self.speed = self.base_speed + (self.difficulty - 1) * 0.6
        for obs in self.obstacles:
            obs.speed = self.speed

        self.bg_offset = (self.bg_offset + self.speed) % 60
        self.update_particles()

    def draw_background(self, frame):
        frame[:] = (30, 30, 50)

        for i in range(0, GAME_W + 60, 60):
            x = i - int(self.bg_offset)
            cv2.line(frame, (x, GROUND_Y + 20), (x, GAME_H), (40, 40, 60), 1)

        cv2.line(frame, (0, GROUND_Y), (GAME_W, GROUND_Y), (80, 80, 80), 2)
        cv2.rectangle(frame, (0, GROUND_Y), (GAME_W, GAME_H), (50, 50, 50), -1)

        for i in range(0, GAME_W + 80, 80):
            x = i - int(self.bg_offset * 1.5) % 80
            cv2.rectangle(frame, (x, GROUND_Y - 5), (x + 30, GROUND_Y), (60, 80, 60), -1)

        cv2.putText(frame, f"Score: {self.score}", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        cv2.putText(frame, f"Lives: {'♥ ' * self.lives}", (20, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(frame, f"Level: {self.difficulty}", (20, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 0), 2)
        cv2.putText(frame, f"Speed: {self.speed:.1f}", (20, 130),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1)

    def draw_particles(self, frame):
        for p in self.particles:
            alpha = p[4] / 25.0
            color = tuple(int(c * alpha) for c in p[5])
            cv2.circle(frame, (int(p[0]), int(p[1])), max(2, int(4 * alpha)), color, -1)

    def draw_hud(self, frame):
        move_delta, duck, jump = self.last_controls
        status_parts = []
        if abs(move_delta) > 30:
            status_parts.append("LEFT" if move_delta < 0 else "RIGHT")
        if duck:
            status_parts.append("DUCK")
        if jump:
            status_parts.append("JUMP")
        status = " | ".join(status_parts) if status_parts else "STAND"
        cv2.putText(frame, f"Action: {status}", (GAME_W - 250, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        if self.state == self.STATE_READY:
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (GAME_W, GAME_H), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
            cv2.putText(frame, "BODY OBSTACLE GAME", (GAME_W // 2 - 220, GAME_H // 2 - 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 255, 255), 3)
            cv2.putText(frame, "Lean LEFT/RIGHT to move", (GAME_W // 2 - 180, GAME_H // 2 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
            cv2.putText(frame, "SQUAT to duck (avoid HIGH obstacles)", (GAME_W // 2 - 230, GAME_H // 2 + 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
            cv2.putText(frame, "JUMP with hands up (avoid LOW obstacles)", (GAME_W // 2 - 250, GAME_H // 2 + 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
            cv2.putText(frame, "Press SPACE to START", (GAME_W // 2 - 140, GAME_H // 2 + 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        elif self.state == self.STATE_OVER:
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (GAME_W, GAME_H), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
            cv2.putText(frame, "GAME OVER", (GAME_W // 2 - 150, GAME_H // 2 - 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
            cv2.putText(frame, f"Final Score: {self.score}", (GAME_W // 2 - 120, GAME_H // 2 + 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            cv2.putText(frame, f"Level Reached: {self.difficulty}", (GAME_W // 2 - 120, GAME_H // 2 + 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 0), 2)
            cv2.putText(frame, "Press SPACE to RESTART", (GAME_W // 2 - 160, GAME_H // 2 + 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    def draw_camera_preview(self, frame, cam_frame, results):
        if cam_frame is None:
            return
        small = cv2.resize(cam_frame, (self.cam_w, self.cam_h))
        self.pose_detector.draw_landmarks(small, results)
        x_off = GAME_W - self.cam_w - 10
        y_off = GAME_H - self.cam_h - 10
        frame[y_off:y_off + self.cam_h, x_off:x_off + self.cam_w] = small
        cv2.rectangle(frame, (x_off, y_off),
                       (x_off + self.cam_w, y_off + self.cam_h), (100, 100, 100), 2)

    def run(self):
        self.open_camera()
        cv2.namedWindow("Body Obstacle Game", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Body Obstacle Game", GAME_W, GAME_H)

        print("=" * 50)
        print("  体感障碍躲避闯关游戏")
        print("=" * 50)
        print("  左倾/右倾身体 → 角色左右移动")
        print("  下蹲弯腰     → 角色下蹲（躲避高空障碍）")
        print("  双手上举跳起 → 角色跳跃（躲避低空障碍）")
        print("  SPACE键       → 开始/重新开始")
        print("  ESC键         → 退出游戏")
        print("=" * 50)

        while True:
            ret, cam_frame = self.cap.read()
            if not ret:
                print("摄像头读取失败")
                break

            cam_frame = cv2.flip(cam_frame, 1)
            results = self.pose_detector.process(cam_frame)

            if results.pose_landmarks:
                self.last_controls = self.pose_detector.get_controls(
                    results.pose_landmarks.landmark, cam_frame.shape[1], cam_frame.shape[0]
                )

            self.update()

            game_frame = np.zeros((GAME_H, GAME_W, 3), dtype=np.uint8)
            self.draw_background(game_frame)

            for obs in self.obstacles:
                obs.draw(game_frame)

            if self.invincible_timer > 0 and self.invincible_timer % 6 < 3:
                pass
            else:
                self.player.draw(game_frame)

            self.draw_particles(game_frame)
            self.draw_camera_preview(game_frame, cam_frame, results)
            self.draw_hud(game_frame)

            cv2.imshow("Body Obstacle Game", game_frame)

            key = cv2.waitKey(int(1000 / FPS)) & 0xFF
            if key == 27:
                break
            elif key == 32:
                if self.state == self.STATE_READY:
                    self.state = self.STATE_PLAYING
                elif self.state == self.STATE_OVER:
                    self.reset()
                    self.state = self.STATE_PLAYING

        self.close_camera()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    game = Game()
    game.run()
