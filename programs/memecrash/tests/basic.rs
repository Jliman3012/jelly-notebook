use anchor_lang::prelude::*;
use memecrash::*;

#[test]
fn state_space() {
    assert_eq!(State::INIT_SPACE, 32 + 32 + 32 + 2 + 1);
}
