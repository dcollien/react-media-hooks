export function DeviceSelector({
  deviceId,
  onChange,
  devices,
}: {
  deviceId: string | null;
  onChange: (deviceId: string | null) => void;
  devices: MediaDeviceInfo[];
}) {
  // Get the current device
  const currentDevice = devices.find((device) => device.deviceId === deviceId);

  return (
    <>
      <div>
        <select
          value={deviceId || ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        {!currentDevice && "No selection: using default device"}
        {currentDevice && (
          <pre>{JSON.stringify(currentDevice?.toJSON(), null, 2)}</pre>
        )}
      </div>
    </>
  );
}
