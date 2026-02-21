import sys
sys.path.insert(0, ".")
try:
    import app.main
    print("SUCCESS")
except Exception as e:
    import traceback
    with open("exception.log", "w") as f:
        traceback.print_exc(file=f)
