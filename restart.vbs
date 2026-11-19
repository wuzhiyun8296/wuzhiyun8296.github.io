' restart.vbs - restart backend and frontend (external entry, no dependency on server code)
' Usage: double-click this file, or have the server call: wscript restart.vbs
Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

d = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = d

' 1. kill whatever listens on 3001 (old backend)
ws.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True

' 2. kill whatever listens on 5173 (old frontend)
ws.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True

WScript.Sleep 800

' 3. start backend (append log, so a stale handle cannot lock it)
ws.Run "cmd /c node server.js >> server_log.txt 2>&1", 0, False

' 4. start frontend site
ws.Run "cmd /c npm run dev > dev_log.txt 2>&1", 0, False
