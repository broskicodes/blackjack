use anchor_lang::prelude::*;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

pub mod token;

use token::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod blackjack {
  use super::*;

  pub fn proxy_transfer(ctx: Context<ProxyTransfer>, amount: u64) -> ProgramResult {
    token::proxy_transfer(ctx, amount)
  }
  
  pub fn proxy_mint_to(ctx: Context<ProxyMintTo>, amount: u64) -> ProgramResult {
    token::proxy_mint_to(ctx, amount)
  }
  
  pub fn proxy_burn(ctx: Context<ProxyBurn>, amount: u64) -> ProgramResult {
    token::proxy_burn(ctx, amount)
  }
  
  pub fn proxy_set_authority(
    ctx: Context<ProxySetAuthority>, 
    authority_type: AuthorityType, 
    new_authority: Option<Pubkey>
  ) -> ProgramResult {
    token::proxy_set_authority(ctx, authority_type, new_authority)
  }

  pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;

    base_account.player_accounts = Vec::new();
    base_account.num_player_acnts = 0;
    base_account.tables = Vec::new();
    base_account.num_tables = 0;
    // let table = Table::new(1);

    // base_account.tables.push(table);
    // base_account.num_tables = 1;

    Ok(())
  }

  pub fn new_player(ctx: Context<NewPlayer>) -> ProgramResult {
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;
    let player = &mut ctx.accounts.player;
    
    let mut player_exists = false;
    for i in 0..base_account.num_player_acnts {
      let index: usize = i as usize;

      if base_account.player_accounts[index].key == *user.to_account_info().key {
        base_account.player_accounts[index].value.push(*player.to_account_info().key);
        player_exists = true;
        break;
      }
    }    
    
    if !player_exists {
      base_account.player_accounts.push(
        PlayerMap { 
          key: *user.to_account_info().key,
          value: vec![*player.to_account_info().key], 
          token_account: None 
        }
      );
      base_account.num_player_acnts += 1;
    }

    player.hand = Vec::new();
    player.stake = 0;

    Ok(())
  }

  pub fn new_table(ctx: Context<NewTable>) -> ProgramResult {
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;
    let table = &mut ctx.accounts.table;

    base_account.tables.push(*table.to_account_info().key);
    base_account.num_tables += 1;

    table.deck = Deck::new(1);
    table.players = Vec::new();
    table.num_players = 0;
    table.payout_ratio = Ratio { mult: 2, div: 1 };
    table.blackjack_ratio = Ratio { mult: 15, div: 10 };
    table.dealer = Dealer { hand: Vec::new() };
    table.min_bet = 1;
    table.max_bet = 1000;

    Ok(())
  }

  pub fn connect_to_table(ctx: Context<ConnectToTable>) -> ProgramResult {
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;
    let table = &mut ctx.accounts.table;
    let player = &mut ctx.accounts.player;

    table.players.push(*player.to_account_info().key);
    table.num_players += 1;

    Ok(())
  }

  pub fn set_token_account(ctx: Context<SetTokenAccount>) -> ProgramResult {
    let base_account = &mut ctx.accounts.base_account;
    let user = &mut ctx.accounts.user;
    let token_account = &mut ctx.accounts.token_account;
    
    let mut player_exists = false;
    for i in 0..base_account.num_player_acnts {
      let index: usize = i as usize;

      if base_account.player_accounts[index].key == *user.to_account_info().key {
        base_account.player_accounts[index].token_account = Some(*token_account.key);
        player_exists = true;
        break;
      }
    }

    if !player_exists {
      base_account.player_accounts.push(
        PlayerMap { 
          key: *user.to_account_info().key,
          value: Vec::new(), 
          token_account: Some(*token_account.key), 
        }
      );
      base_account.num_player_acnts += 1;
    }

    Ok(())
  }

  pub fn make_bet(ctx: Context<MakeBet>, bet: u64) -> ProgramResult {
    // let base_account = &mut ctx.accounts.base_account;
    // let user = &mut ctx.accounts.user;
    let table = &mut ctx.accounts.table;
    let player = &mut ctx.accounts.player;

    let mut player_exists = false;
    for i in 0..table.num_players {
      let index: usize = i as usize;

      if table.players[index] == *player.to_account_info().key {
        player_exists = true;
        break;
      }
    }

    if !player_exists {
      Err(ErrorCode::NotSeated.into())
    } else {
      if bet < table.min_bet {
        Err(ErrorCode::SmallBet.into())
      } else if bet > table.max_bet {
        Err(ErrorCode::BigBet.into())
      } else {
        let accounts = &mut ProxyBurn {
          mint: ctx.accounts.mint.clone(),
          to: ctx.accounts.to.clone(),
          authority: ctx.accounts.authority.clone(),
          token_program: ctx.accounts.token_program.clone(),
        };
        // Prolly shouldn't burn first
        let context = Context::new(ctx.accounts.token_program.key, accounts, &[]);
        let result = token::proxy_burn(context, bet);

        match result {
          Ok(_a) => {
            player.stake = bet;
            result
          },
          _ => result
        }
      }
    }
  }

  pub fn get_hand(ctx: Context<GetHand>) -> ProgramResult {
    let table = &mut ctx.accounts.table;
    let player = &mut ctx.accounts.player;

    if player.stake == 0 {
      Err(ErrorCode::NoStake.into())
    } else{
      let deck = &mut table.deck.clone();
      for _i in 0..2 {
        let mut c = deck.get_card();
        table.dealer.hand.push(c);
        c = deck.get_card();
        player.hand.push(c);

        table.deck = deck.clone();
      }

      Ok(())
    }
  }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
  #[account(init, payer = user, space = 64 + 64 + 64)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NewPlayer<'info> {
  #[account(init, payer = user, space = 64 + 64)]
  pub player: Account<'info, Player>,
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NewTable<'info> {
  #[account(init, payer = user, space = 64 + 64 + 64 + 64)]
  pub table: Account<'info, Table>,
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConnectToTable<'info> {
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub player: Account<'info, Player>,
  #[account(mut)]
  pub table: Account<'info, Table>,
  #[account(mut)]
  pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetTokenAccount<'info> {
  #[account(mut)]
  pub base_account: Account<'info, BaseAccount>,
  #[account(mut)]
  pub token_account: AccountInfo<'info>,
  #[account(mut)]
  pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct MakeBet<'info> {
  #[account(mut)]
  pub player: Account<'info, Player>,
  #[account(mut)]
  pub table: Account<'info, Table>,
  #[account(signer)]
  pub authority: AccountInfo<'info>,
  #[account(mut)]
  pub mint: AccountInfo<'info>,
  #[account(mut)]
  pub to: AccountInfo<'info>,
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct GetHand<'info> {
  #[account(mut)]
  pub player: Account<'info, Player>,
  #[account(mut)]
  pub table: Account<'info, Table>,
}

#[derive(Debug, EnumIter, Copy, Clone, AnchorDeserialize, AnchorSerialize)]
pub enum Suit {
  Heart,
  Club,
  Diamond,
  Spade,
}

#[derive(Debug, Clone, Copy, AnchorDeserialize, AnchorSerialize)]
pub enum CardValue {
  Ace,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,
  Ten,
  Jack,
  Queen,
  King,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct Card {
  pub suit: Suit,
  pub val: CardValue,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Deck {
  pub cards: Vec<Card>,
  pub val_map: Vec<CardMap>,
  pub pile: Vec<Card>,
}

impl Deck {
  pub fn new(num_decks: u8) -> Deck {
    let mut deck = Deck {
      cards: Vec::new(),
      val_map: Vec::new(),
      pile: Vec::new(),
    };

    for i in 0..13 {
      let num: u8 = match i {
        0 => 11,
        1..=9 => i + 1,
        _ => 10
      };

      let val: Option<CardValue> = match i {
        0 => Some(CardValue::Ace),
        1 => Some(CardValue::Two),
        2 => Some(CardValue::Three),
        3 => Some(CardValue::Four),
        4 => Some(CardValue::Five),
        5 => Some(CardValue::Six),
        6 => Some(CardValue::Seven),
        7 => Some(CardValue::Eight),
        8 => Some(CardValue::Nine),
        9 => Some(CardValue::Ten),
        10 => Some(CardValue::Jack),
        11 => Some(CardValue::Queen),
        12 => Some(CardValue::King),
        _ => None
      };

      deck.val_map.push(CardMap { key: val.unwrap(), value: num });


      for suit in Suit::iter() {
        for _j in 0..num_decks {
          deck.cards.push(Card { suit: suit, val: val.unwrap() });
        }
      }
    }
    
    deck
  }

  pub fn shuffle(&mut self) {

  }

  pub fn get_card(&mut self) -> Card {
    let c = self.cards.pop().unwrap();
    self.pile.push(c.clone());

    c
  }
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct CardMap {
  pub key: CardValue,
  pub value: u8,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct PlayerMap {
  pub key: Pubkey,
  pub value: Vec<Pubkey>,
  pub token_account: Option<Pubkey>,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Ratio {
  pub mult: u64,
  pub div: u64,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Dealer {
  pub hand: Vec<Card>,
}



// impl Table {
//   pub fn new(num_decks: u64) -> Table {
//     let table = Table {
//       deck: Deck::new(),
      
//     }
//   }

//   table
// }

#[account]
pub struct BaseAccount {
  pub player_accounts: Vec<PlayerMap>,
  pub num_player_acnts: u64,
  pub tables: Vec<Pubkey>,
  pub num_tables: u64,
}

#[account]
pub struct Player {
  pub hand: Vec<Card>, 
  pub stake: u64,
}

#[account]
pub struct Table {
  pub deck: Deck,
  pub dealer: Dealer,
  pub players: Vec<Pubkey>,
  pub num_players: u64,
  pub min_bet: u64,
  pub max_bet: u64,
  pub payout_ratio: Ratio,
  pub blackjack_ratio: Ratio,
}

#[error]
pub enum ErrorCode {
  #[msg("Bet size too big for table.")]
  BigBet,
  #[msg("Bet size too small for table.")]
  SmallBet,
  #[msg("Player not seated at table.")]
  NotSeated,
  #[msg("Seems a bet has not been made.")]
  NoStake,
}