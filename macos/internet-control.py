#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys,time,re,urllib.request,os,signal
root=Path(__file__).resolve().parent/'internet'
binary=root/'cloudflared';pidfile=root/'tunnel.pid';logfile=root/'tunnel.log'
def running():
 try:
  pid=int(pidfile.read_text());command=subprocess.check_output(['ps','-p',str(pid),'-o','command='],text=True)
  return pid if str(binary) in command else None
 except (OSError,ValueError,subprocess.CalledProcessError):return None
pid=running()
if '--stop' in sys.argv:
 if pid:os.kill(pid,signal.SIGTERM)
 print('인터넷 대전 연결을 종료했습니다.');sys.exit()
subprocess.run(['open','/Applications/Tetris Battle.app'],check=True)
for i in range(15):
 try:urllib.request.urlopen('http://127.0.0.1:8080/desktop-health',timeout=2);break
 except OSError:time.sleep(1)
else:sys.exit('맥 게임 서버를 실행하지 못했습니다.')
if not pid:
 if not binary.exists():sys.exit('cloudflared 연결 도구가 없습니다.')
 with logfile.open('wb') as log:p=subprocess.Popen([str(binary),'tunnel','--no-autoupdate','--url','http://127.0.0.1:8080'],stdout=log,stderr=log,start_new_session=True)
 pid=p.pid;pidfile.write_text(str(pid))
subprocess.Popen(['/usr/bin/caffeinate','-i','-w',str(pid)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
for i in range(30):
 urls=re.findall(r'https://[a-z0-9-]+\.trycloudflare\.com',logfile.read_text(errors='replace'))
 if urls:
  print('두 사람 모두 이 주소에서 접속하세요:\n'+urls[-1]);subprocess.run(['open',urls[-1]]);break
 time.sleep(1)
else:sys.exit('인터넷 주소를 만들지 못했습니다. tunnel.log를 확인하세요.')
