process.stdout.write('supervisor fixture started\n');
process.stderr.write('intentional fixture exit\n');
setTimeout(() => process.exit(3), 100);
