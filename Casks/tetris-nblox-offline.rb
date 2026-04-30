cask "tetris-nblox-offline" do
  version "1.0.0"
  sha256 "bbbb85344012bc1e7f507ae4cae0a9d456ecf28e45caa602a3704396b1d5f696"

  url "https://github.com/Svanny/n-blox-offline/releases/download/v#{version}/tetris-nblox-wacz-offline-#{version}-mac-x64.zip"
  name "Tetris N-BLOX Offline"
  desc "Offline Electron wrapper for Tetris N-BLOX"
  homepage "https://github.com/Svanny/n-blox-offline"

  app "Tetris N-BLOX Offline.app"

  caveats <<~EOS
    This app is ad-hoc signed, not Apple-notarized. macOS may ask you to approve
    it the first time you open it.
  EOS
end
