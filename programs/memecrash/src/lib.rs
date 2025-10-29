use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

anchor_lang::declare_id!("MemecRasH111111111111111111111111111111111");

#[program]
mod memecrash {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, config: InitializeConfig) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = *ctx.accounts.admin.key;
        state.treasury = config.treasury;
        state.fee_bps = config.fee_bps;
        state.bet_mint = ctx.accounts.bet_mint.key();
        state.bump = *ctx.bumps.get("state").unwrap();
        Ok(())
    }

    pub fn create_round(ctx: Context<CreateRound>, round_no: u64, ruleset_version: u8) -> Result<()> {
        let round = &mut ctx.accounts.round;
        round.round_no = round_no;
        round.status = RoundStatus::Pending;
        round.ruleset_version = ruleset_version;
        round.token_mint = ctx.accounts.bet_mint.key();
        round.current_multiplier_bps = Self::MIN_BASE_MULTIPLIER_BPS;
        round.bump = *ctx.bumps.get("round").unwrap();
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64) -> Result<()> {
        require!(amount > 0, MemecrashError::InvalidAmount);
        require!(ctx.accounts.round.status == RoundStatus::Pending, MemecrashError::RoundLocked);

        let seeds = &[b"round", &ctx.accounts.round.round_no.to_le_bytes(), &[ctx.accounts.round.bump]];
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.round_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let bet = &mut ctx.accounts.bet;
        bet.round = ctx.accounts.round.key();
        bet.user = ctx.accounts.user.key();
        bet.amount = amount;
        bet.cashed_out = false;
        bet.payout = 0;
        bet.cash_out_multiplier_bps = 0;
        bet.bump = *ctx.bumps.get("bet").unwrap();

        emit!(BetPlaced {
            round: ctx.accounts.round.key(),
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }

    pub fn update_round_state(
        ctx: Context<UpdateRoundState>,
        status: RoundStatus,
        current_multiplier_bps: u64,
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.state.admin, ctx.accounts.admin.key(), MemecrashError::Unauthorized);
        require!(
            current_multiplier_bps >= Self::MIN_BASE_MULTIPLIER_BPS,
            MemecrashError::InvalidMultiplier
        );
        require!(
            current_multiplier_bps >= ctx.accounts.round.current_multiplier_bps,
            MemecrashError::MultiplierRegression
        );

        ctx.accounts.round.status = status;
        ctx.accounts.round.current_multiplier_bps = current_multiplier_bps;

        Ok(())
    }

    pub fn cash_out(ctx: Context<CashOut>, multiplier_bps: u64) -> Result<()> {
        require!(
            ctx.accounts.round.status == RoundStatus::Running
                || ctx.accounts.round.status == RoundStatus::Crashed,
            MemecrashError::RoundNotRunning
        );
        require!(!ctx.accounts.bet.cashed_out, MemecrashError::AlreadyCashedOut);
        require!(
            multiplier_bps >= Self::MIN_BASE_MULTIPLIER_BPS,
            MemecrashError::InvalidMultiplier
        );
        require!(
            multiplier_bps <= ctx.accounts.round.current_multiplier_bps,
            MemecrashError::MultiplierTooHigh
        );
        let fee = ctx.accounts.state.fee_bps as u128;
        let payout = ctx.accounts.bet.amount as u128 * multiplier_bps as u128 / 10_000u128;
        let fee_amount = payout * fee / 10_000u128;
        let player_amount = payout - fee_amount;
        require!(player_amount <= u64::MAX as u128, MemecrashError::InvalidMultiplier);
        require!(fee_amount <= u64::MAX as u128, MemecrashError::InvalidMultiplier);
        require!(
            player_amount + fee_amount <= ctx.accounts.round_vault.amount as u128,
            MemecrashError::InsufficientVaultBalance
        );

        let seeds = &[b"round", &ctx.accounts.round.round_no.to_le_bytes(), &[ctx.accounts.round.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.round_vault.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: ctx.accounts.round.to_account_info(),
                },
                signer,
            ),
            player_amount as u64,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.round_vault.to_account_info(),
                    to: ctx.accounts.treasury_vault.to_account_info(),
                    authority: ctx.accounts.round.to_account_info(),
                },
                signer,
            ),
            fee_amount as u64,
        )?;

        ctx.accounts.bet.cashed_out = true;
        ctx.accounts.bet.payout = player_amount as u64;
        ctx.accounts.bet.cash_out_multiplier_bps = multiplier_bps;

        emit!(CashOutEvent {
            round: ctx.accounts.round.key(),
            user: ctx.accounts.user.key(),
            payout: player_amount as u64,
        });

        Ok(())
    }
}

impl memecrash {
    const MIN_BASE_MULTIPLIER_BPS: u64 = 10_000;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>;
    #[account(
        init,
        payer = admin,
        seeds = [b"state"],
        bump,
        space = 8 + State::INIT_SPACE
    )]
    pub state: Account<'info, State>;
    pub bet_mint: Account<'info, Mint>;
    pub system_program: Program<'info, System>;
}

#[derive(Accounts)]
pub struct CreateRound<'info> {
    #[account(mut, has_one = admin @ MemecrashError::Unauthorized)]
    pub state: Account<'info, State>;
    pub admin: Signer<'info>;
    #[account(
        init,
        payer = admin,
        seeds = [b"round", &round_no.to_le_bytes()],
        bump,
        space = 8 + Round::INIT_SPACE
    )]
    pub round: Account<'info, Round>;
    #[account(
        init,
        payer = admin,
        seeds = [b"vault", &round_no.to_le_bytes()],
        bump,
        token::mint = bet_mint,
        token::authority = round
    )]
    pub round_vault: Account<'info, TokenAccount>;
    pub bet_mint: Account<'info, Mint>;
    pub token_program: Program<'info, Token>;
    pub system_program: Program<'info, System>;
    pub rent: Sysvar<'info, Rent>;
}

#[derive(Accounts)]
pub struct UpdateRoundState<'info> {
    #[account(mut, has_one = admin @ MemecrashError::Unauthorized)]
    pub state: Account<'info, State>;
    pub admin: Signer<'info>;
    #[account(mut, seeds = [b"round", &round.round_no.to_le_bytes()], bump = round.bump)]
    pub round: Account<'info, Round>;
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub state: Account<'info, State>;
    #[account(mut, seeds = [b"round", &round.round_no.to_le_bytes()], bump = round.bump)]
    pub round: Account<'info, Round>;
    #[account(
        init,
        payer = user,
        seeds = [b"bet", round.key().as_ref(), user.key().as_ref()],
        bump,
        space = 8 + Bet::INIT_SPACE
    )]
    pub bet: Account<'info, Bet>;
    #[account(mut)]
    pub user: Signer<'info>;
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>;
    #[account(mut, seeds = [b"vault", &round.round_no.to_le_bytes()], bump)]
    pub round_vault: Account<'info, TokenAccount>;
    pub token_program: Program<'info, Token>;
    pub system_program: Program<'info, System>;
}

#[derive(Accounts)]
pub struct CashOut<'info> {
    pub state: Account<'info, State>;
    #[account(mut, seeds = [b"round", &round.round_no.to_le_bytes()], bump = round.bump)]
    pub round: Account<'info, Round>;
    #[account(mut, seeds = [b"bet", round.key().as_ref(), user.key().as_ref()], bump = bet.bump, has_one = round, has_one = user)]
    pub bet: Account<'info, Bet>;
    #[account(mut)]
    pub user: Signer<'info>;
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>;
    #[account(mut, seeds = [b"vault", &round.round_no.to_le_bytes()], bump)]
    pub round_vault: Account<'info, TokenAccount>;
    #[account(mut)]
    pub treasury_vault: Account<'info, TokenAccount>;
    pub token_program: Program<'info, Token>;
}

#[account]
pub struct State {
    pub admin: Pubkey;
    pub treasury: Pubkey;
    pub bet_mint: Pubkey;
    pub fee_bps: u16;
    pub bump: u8;
}

impl State {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 2 + 1;
}

#[account]
pub struct Round {
    pub round_no: u64;
    pub token_mint: Pubkey;
    pub status: RoundStatus;
    pub ruleset_version: u8;
    pub current_multiplier_bps: u64;
    pub bump: u8;
}

impl Round {
    pub const INIT_SPACE: usize = 8 + 32 + 1 + 1 + 8;
}

#[account]
pub struct Bet {
    pub round: Pubkey;
    pub user: Pubkey;
    pub amount: u64;
    pub cashed_out: bool;
    pub payout: u64;
    pub cash_out_multiplier_bps: u64;
    pub bump: u8;
}

impl Bet {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeConfig {
    pub treasury: Pubkey;
    pub fee_bps: u16;
}

#[event]
pub struct BetPlaced {
    pub round: Pubkey;
    pub user: Pubkey;
    pub amount: u64;
}

#[event]
pub struct CashOutEvent {
    pub round: Pubkey;
    pub user: Pubkey;
    pub payout: u64;
}

#[account]
pub struct RoundVault {}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoundStatus {
    Pending,
    Locked,
    Running,
    Crashed,
    Settled,
    Canceled,
}

#[error_code]
pub enum MemecrashError {
    #[msg("Round is locked")] 
    RoundLocked,
    #[msg("Invalid bet amount")] 
    InvalidAmount,
    #[msg("Round not running")] 
    RoundNotRunning,
    #[msg("Bet already cashed out")]
    AlreadyCashedOut,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid multiplier")]
    InvalidMultiplier,
    #[msg("Multiplier exceeds allowed round progression")]
    MultiplierTooHigh,
    #[msg("Multiplier cannot decrease")]
    MultiplierRegression,
    #[msg("Vault does not have enough balance for payout")]
    InsufficientVaultBalance,
}
