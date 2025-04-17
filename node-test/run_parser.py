from replay import ReplayParser # Assuming node_test is in your PYTHONPATH or you run from the parent directory

# Use the example replay file path
replay_file = '1v1_gg_win_how.rec' 

# Instantiate the parser. This will load and process the data via __init__ -> load -> process_data
try:
    parser = ReplayParser(filePath=replay_file)

    # Print the parsed data using the __str__ method
    if parser.success:
        print(parser)
    else:
        print(f"Failed to parse replay file: {replay_file}")

except ImportError as e:
    print(f"ImportError: {e}. Make sure 'classes.oppbot_settings' and 'classes.oppbot_ucs' are available or modify the imports in replay.py.")
except FileNotFoundError:
    print(f"Error: Replay file not found at {replay_file}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
