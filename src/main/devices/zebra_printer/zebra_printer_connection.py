import sys
import win32print

def print_zpl_to_usb_printer(printer_name, zpl_file_path):
    printer_handle = None
    try:
        # Open the ZPL file and read its content
        with open(zpl_file_path, 'r') as zpl_file:
            zpl_content = zpl_file.read()

        # Open the printer for writing
        printer_handle = win32print.OpenPrinter(printer_name, {"DesiredAccess": win32print.PRINTER_ACCESS_USE})

        # Start a print job
        job_info = win32print.StartDocPrinter(printer_handle, 1, ("Print Job", None, "RAW"))
        win32print.StartPagePrinter(printer_handle)

        # Write the ZPL content to the printer
        win32print.WritePrinter(printer_handle, zpl_content.encode('utf-8'))

        # End the print job
        win32print.EndPagePrinter(printer_handle)
        win32print.EndDocPrinter(printer_handle)

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        # Close the printer handle if it's not None
        if printer_handle is not None:
            win32print.ClosePrinter(printer_handle)

if __name__ == "__main__":
    # Check if the correct number of arguments are provided
    if len(sys.argv) != 3:
        print("Usage: python script_name.py printer_name zpl_file_path")
        sys.exit(1)

    # Extract printer name and ZPL file path from command-line arguments
    printer_name = sys.argv[1]
    zpl_file_path = sys.argv[2]

    # Print to the USB printer using ZPL file content
    print_zpl_to_usb_printer(printer_name, zpl_file_path)
