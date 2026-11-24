function patchCommentsMovie(original) {
  const view = new DataView(original.buffer);
  const successStart = 156520;
  const postStart = 156552;
  const actionEnd = 156563;
  const buttonLengthOffset = 156158;
  const lastConditionOffset = 156196;
  const validationExitOffsets = [156332, 156459, 156518];
  const expected = [
    0x8b, 12, 0, ...new TextEncoder().encode("_root.error\0"),
    0x8c, 10, 0, ...new TextEncoder().encode("thank_you\0"),
    0x8b, 1, 0, 0,
    0x96, 4, 0, 8, 7, 8, 1, 0x9a, 1, 0, 2,
  ];
  if (
    original.length !== 378836 ||
    original[3] !== 5 ||
    view.getUint16(buttonLengthOffset - 2, true) !== (34 << 6 | 63) ||
    view.getUint32(buttonLengthOffset, true) !== 402 ||
    view.getUint16(lastConditionOffset, true) !== 0 ||
    !validationExitOffsets.every(offset =>
      offset + 2 + view.getInt16(offset, true) === actionEnd) ||
    !expected.every((byte, i) => original[successStart + i] === byte)
  ) {
    throw new Error("The Comments movie does not match the expected Flash source.");
  }

  const encoder = new TextEncoder();
  const uint16 = value => [value & 255, value >> 8];
  const action = (code, payload) => [code, ...uint16(payload.length), ...payload];
  const push = (...values) => action(0x96, values.flatMap(value => (
    typeof value === "number" ? [7, value, 0, 0, 0] : [0, ...encoder.encode(value), 0]
  )));
  const variable = name => [...push(name), 0x1c];
  const external = method => [
    ...variable("_global"),
    ...push("flash"), 0x4e,
    ...push("external"), 0x4e,
    ...push("ExternalInterface"), 0x4e,
    ...push(method), 0x52, 0x17,
  ];

  // Clear the root timeline's bound text fields before showing the original
  // thank-you message. The page invokes this callback only after acceptance.
  const fields = ["sender_name", "sender_email", "message"];
  const thankYou = [
    ...fields.flatMap(name => [...push(`_root.${name}`, ""), 0x1d]), // ActionSetVariable
    ...original.subarray(successStart, postStart),
    0,
  ];
  const bridge = Uint8Array.from([
    ...action(0x9b, [0, 0, 0, ...uint16(thankYou.length)]),
    ...thankYou,
    ...variable("_root"), ...push("showCommentsThankYou", 3),
    ...external("addCallback"),
    ...fields.slice().reverse().flatMap(variable),
    ...push("receiveFlashComments", 4),
    ...external("call"),
  ]);

  const growth = bridge.length - (actionEnd - successStart);
  const movie = new Uint8Array(original.length + growth);
  movie.set(original.subarray(0, successStart));
  movie.set(bridge, successStart);
  movie.set(original.subarray(actionEnd), successStart + bridge.length);
  movie[3] = 8; // ExternalInterface was introduced in Flash Player 8.
  const patchedView = new DataView(movie.buffer);
  patchedView.setUint32(4, movie.length, true);
  patchedView.setUint32(buttonLengthOffset, 402 + growth, true);
  for (const offset of validationExitOffsets) {
    patchedView.setInt16(offset, view.getInt16(offset, true) + growth, true);
  }
  return movie;
}

export async function loadCommentsMovie(stage, receiveComments) {
  const source = await fetch(new URL("./comments_final.swf", import.meta.url));
  if (!source.ok) throw new Error("Could not load the Comments movie.");

  const movie = patchCommentsMovie(new Uint8Array(await source.arrayBuffer()));
  const player = window.RufflePlayer.newest().createPlayer();
  const api = player.ruffle();
  window.receiveFlashComments = receiveComments;
  stage.append(player);
  await api.load({
    data: movie,
    swfFileName: "comments_final.swf",
    base: new URL("./", import.meta.url).href,
    allowScriptAccess: true,
  });
  return player;
}
