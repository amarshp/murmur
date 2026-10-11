// better-sqlite3 is rebuilt for Electron, so plain Node (node --test) cannot
// always load it. Tests that need a real database skip when that is the cause.
function isNativeBindingUnavailable(error) {
  const message = String(error?.message ?? error);
  return (
    message.includes("NODE_MODULE_VERSION") ||
    message.includes("Could not locate the bindings file")
  );
}

module.exports = { isNativeBindingUnavailable };
