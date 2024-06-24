const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function getPrimaryInterface() {
  try {
    // Execute the 'ip route show default' command to get the default route
    const { stdout, stderr } = await exec('ip route show default');

    // Extract the interface from the output
    const match = stdout.match(/dev\s+(\S+)/);
    if (match && match[1]) {
      return match[1]; // Return the primary interface name
    } else {
      throw new Error('Unable to determine primary interface');
    }
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    throw error;
  }
}

module.export = getPrimaryInterface;