call npx vsce package
copy /y *.vsix %USERPROFILE%\.arduinoIDE\plugins\
"%USERPROFILE%\AppData\Local\Programs\Arduino IDE\Arduino IDE.exe"
